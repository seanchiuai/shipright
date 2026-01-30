"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { AppNavbar } from "@/components/app-navbar";
import {
  ChatMessage,
  ChoiceCard,
  ChoiceGrid,
  MagicTextarea,
  AIConversation,
} from "@/components/interview";

type Requirements = {
  appName: string;
  tagline: string;
  appType: string;
  problemStatement: string;
  primaryUser: { type: string; coreNeed: string };
  secondaryUsers: Array<{ type: string; coreNeed: string }>;
  coreAction: string;
  hasPayments: boolean;
  paymentContext: string | null;
  platform: string;
  keyFeatures: string[];
  constraints: { timeline: string | null; mustHave: string[]; mustNotHave: string[] };
  devAgentNotes: string;
};

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const projectId = params.id as Id<"projects">;

  const convexUser = useSyncUser();
  const project = useQuery(api.projects.get, { projectId });
  const messages = useQuery(api.interviews.getMessages, { projectId });

  // Mutations and actions
  const addMessage = useMutation(api.interviews.addMessage);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);
  const continueConversation = useAction(api.ai.continueConversation);
  const extractRequirements = useAction(api.ai.extractRequirements);
  const resetInterview = useMutation(api.projects.resetInterview);
  const updateRequirements = useMutation(api.projects.updateRequirements);
  const updateStatus = useMutation(api.projects.updateStatus);

  // State
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTypewriterDone, setIsTypewriterDone] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [multiselectValue, setMultiselectValue] = useState<string[]>([]);
  const [customInputMode, setCustomInputMode] = useState(false);

  // Track which AI message IDs we've already seen (for typewriter)
  const seenAiMessages = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derived state
  const phase = project?.interviewPhase || "seed";
  const isComplete = messages?.some((m) => m.isComplete);
  const lastAiMsg = messages?.filter((m) => m.role === "assistant").at(-1);
  const exchangeCount = messages?.filter((m) => m.role === "user").length ?? 0;
  const requirements = project?.requirements as Requirements | undefined;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length, loading]);

  // Mark existing messages as seen on first load
  useEffect(() => {
    if (messages && seenAiMessages.current.size === 0 && messages.length > 0) {
      // Mark all but the last AI message as seen
      const aiMessages = messages.filter((m) => m.role === "assistant");
      for (let i = 0; i < aiMessages.length - 1; i++) {
        seenAiMessages.current.add(aiMessages[i]._id);
      }
      // If we're resuming with messages, mark the last one as seen too (no typewriter on reload)
      if (aiMessages.length > 0) {
        seenAiMessages.current.add(aiMessages[aiMessages.length - 1]._id);
        setIsTypewriterDone(true);
      }
    }
  }, [messages]);

  // Auto-trigger conversation if we have an appIdea but no messages yet (from dashboard submit)
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (
      project?.appIdea &&
      messages &&
      messages.length === 0 &&
      !loading &&
      !autoTriggered.current
    ) {
      autoTriggered.current = true;
      (async () => {
        setLoading(true);
        try {
          await addMessage({ projectId, role: "user", content: project.appIdea! });
          if (phase === "seed") {
            await updateAppIdea({ projectId, appIdea: project.appIdea! });
          }
          seenAiMessages.current.clear();
          await continueConversation({
            projectId,
            appIdea: project.appIdea!,
            history: [{ role: "user", content: project.appIdea! }],
          });
        } catch (e) {
          console.error(e);
          autoTriggered.current = false;
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, project?.appIdea, messages?.length]);

  const handleSubmitIdea = useCallback(async () => {
    if (!currentInput.trim() || loading) return;
    const idea = currentInput.trim();
    setLoading(true);
    setCurrentInput("");

    try {
      await addMessage({ projectId, role: "user", content: idea });
      await updateAppIdea({ projectId, appIdea: idea });
      seenAiMessages.current.clear();
      await continueConversation({
        projectId,
        appIdea: idea,
        history: [{ role: "user", content: idea }],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentInput, loading, projectId, addMessage, updateAppIdea, continueConversation]);

  const handleAnswer = useCallback(
    async (answer: string | string[]) => {
      if (loading || !project?.appIdea || !messages) return;
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

      setLoading(true);
      setCurrentInput("");
      setMultiselectValue([]);
      setCustomInputMode(false);

      try {
        await addMessage({ projectId, role: "user", content: answerText });

        // Build history from current messages + new answer
        const history = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: answerText },
        ];

        seenAiMessages.current.clear();
        // Mark all current AI messages as seen
        messages.filter((m) => m.role === "assistant").forEach((m) => {
          seenAiMessages.current.add(m._id);
        });

        const result = await continueConversation({
          projectId,
          appIdea: project.appIdea,
          history,
        });

        // Check if AI signals completion or we've hit the cap
        const newExchangeCount = exchangeCount + 1;
        if (result.isComplete || newExchangeCount >= 6) {
          await extractRequirements({ projectId });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, project?.appIdea, messages, projectId, addMessage, continueConversation, exchangeCount, extractRequirements]
  );

  const handleFinishEarly = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await extractRequirements({ projectId });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, extractRequirements]);

  const handleStartOver = useCallback(async () => {
    setLoading(true);
    try {
      await resetInterview({ projectId });
      seenAiMessages.current.clear();
      setCurrentInput("");
      setMultiselectValue([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, resetInterview]);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await updateStatus({ projectId, status: "matching" });
      if (!convexUser?.githubToken) {
        router.push(`/connect-github?returnTo=/project/${projectId}`);
      } else {
        router.push(`/project/${projectId}`);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, updateStatus, router, convexUser?.githubToken]);

  // Edit handlers for requirements
  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async (field: string) => {
    if (!requirements) return;
    const updated = { ...requirements };
    if (field === "appName") updated.appName = editValue;
    else if (field === "problemStatement") updated.problemStatement = editValue;
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  };

  const saveUserEdit = async (index: number, type: string, coreNeed: string) => {
    if (!requirements) return;
    const updated = { ...requirements, secondaryUsers: [...requirements.secondaryUsers] };
    updated.secondaryUsers[index] = { type, coreNeed };
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  };

  const addSecondaryUser = async () => {
    if (!requirements) return;
    const updated = {
      ...requirements,
      secondaryUsers: [...requirements.secondaryUsers, { type: "New User", coreNeed: "" }],
    };
    await updateRequirements({ projectId, requirements: updated });
  };

  const removeSecondaryUser = async (index: number) => {
    if (!requirements) return;
    const updated = { ...requirements, secondaryUsers: requirements.secondaryUsers.filter((_, i) => i !== index) };
    await updateRequirements({ projectId, requirements: updated });
  };

  const saveFeatureEdit = async (index: number, value: string) => {
    if (!requirements) return;
    const updated = { ...requirements, keyFeatures: [...requirements.keyFeatures] };
    updated.keyFeatures[index] = value;
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  };

  const addFeature = async () => {
    if (!requirements) return;
    const updated = {
      ...requirements,
      keyFeatures: [...requirements.keyFeatures, "New feature"],
    };
    await updateRequirements({ projectId, requirements: updated });
  };

  const removeFeature = async (index: number) => {
    if (!requirements) return;
    const updated = { ...requirements, keyFeatures: requirements.keyFeatures.filter((_, i) => i !== index) };
    await updateRequirements({ projectId, requirements: updated });
  };

  // Loading state
  if (!isLoaded || convexUser === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(40, 22%, 97%)" }}>
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          <span className="text-[13px] text-stone-400">Loading your project...</span>
        </motion.div>
      </div>
    );
  }

  if (!clerkUser) {
    router.push("/");
    return null;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[14px] text-stone-400">Project not found</p>
      </div>
    );
  }

  // Determine input mode from last AI message
  const showChoiceInput = lastAiMsg && !isComplete && phase === "conversation" &&
    (lastAiMsg.questionType === "choice" || lastAiMsg.questionType === "multiselect") &&
    lastAiMsg.options;
  const showTextInput = phase === "seed" || (phase === "conversation" && !isComplete && (!showChoiceInput || customInputMode));

  // Example idea chips for seed phase
  const exampleIdeas = [
    "A marketplace where local tutors connect with students",
    "A habit tracker that sends daily check-ins",
    "A recipe sharing app with meal planning",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Warm paper background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(168deg, hsl(40, 22%, 97%) 0%, hsl(35, 16%, 95%) 40%, hsl(30, 14%, 94%) 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <AppNavbar title={project?.name} />

      {/* Chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <AIConversation className="max-w-2xl mx-auto px-6 pt-12 pb-6">
            {/* Seed phase — welcome message */}
            {phase === "seed" && (!messages || messages.length === 0) && (
              <ChatMessage
                message="What's the app you've been dreaming about? Tell me everything — who it's for, what problem it solves, what makes it special."
                isAI
              />
            )}

            {/* Conversation messages from DB */}
            <AnimatePresence mode="popLayout">
              {messages?.map((msg) => {
                const isAI = msg.role === "assistant";
                const isSeen = seenAiMessages.current.has(msg._id);
                const shouldTypewrite = isAI && !isSeen;

                // After rendering, mark as seen
                if (isAI && !isSeen) {
                  // We'll mark it seen when typewriter completes
                }

                return (
                  <ChatMessage
                    key={msg._id}
                    message={msg.content}
                    isAI={isAI}
                    delay={isAI ? 0.2 : 0}
                    userImageUrl={!isAI ? clerkUser.imageUrl : undefined}
                  >
                    {/* Show choice options inline for the last AI message */}
                    {isAI &&
                      msg._id === lastAiMsg?._id &&
                      !isComplete &&
                      (msg.questionType === "choice" || msg.questionType === "multiselect") &&
                      msg.options &&
                      isTypewriterDone && (
                        <motion.div
                          className="mt-5 space-y-2"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                          <ChoiceGrid
                            options={msg.options}
                            selected={msg.questionType === "multiselect" ? multiselectValue : ""}
                            onChange={(val) => {
                              if (msg.questionType === "multiselect") {
                                setMultiselectValue(val as string[]);
                              } else {
                                handleAnswer(val);
                              }
                            }}
                            multiSelect={msg.questionType === "multiselect"}
                          />
                          {!customInputMode && (
                            <div className="pt-0.5">
                              <ChoiceCard
                                label="Something else"
                                selected={false}
                                onClick={() => setCustomInputMode(true)}
                                icon={<Pencil className="w-3.5 h-3.5" />}
                                multiSelect={msg.questionType === "multiselect"}
                                delay={(msg.options?.length ?? 0) * 0.04}
                              />
                            </div>
                          )}
                          {msg.questionType === "multiselect" && (
                            <motion.div
                              className="pt-2 flex justify-end"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <button
                                onClick={() => handleAnswer(multiselectValue)}
                                disabled={multiselectValue.length === 0}
                                className="inline-flex items-center gap-1.5 h-8 px-4 bg-stone-800 text-white text-[13px] font-medium rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Continue
                              </button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                  </ChatMessage>
                );
              })}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                className="flex gap-4 items-start self-start"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center shadow-sm">
                  <Image src="/logo.png" alt="ShipRight" width={20} height={20} className="w-4 h-4 object-contain brightness-0 invert" />
                </div>
                <div className="flex gap-1.5 items-center pt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-stone-400"
                      animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.85, 1, 0.85] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.4,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Requirements summary */}
            {phase === "summary" && requirements && (
              <motion.div
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h3 className="font-serif text-xl tracking-tight text-stone-800">Here&apos;s what I understood</h3>

                {/* App Name */}
                <div className="flex items-start justify-between p-3 rounded-lg bg-stone-50/80">
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">App Name</p>
                    {editingField === "appName" ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                        />
                        <Button size="sm" variant="ghost" onClick={() => saveEdit("appName")}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-medium">{requirements.appName}</p>
                    )}
                  </div>
                  {editingField !== "appName" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit("appName", requirements.appName)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Type, Platform, Payments */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-stone-50/80">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Type</p>
                    <p className="font-medium text-sm">{requirements.appType}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50/80">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Platform</p>
                    <p className="font-medium text-sm">{requirements.platform}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50/80">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Payments</p>
                    <p className="font-medium text-sm">
                      {requirements.hasPayments ? (requirements.paymentContext || "Yes") : "None"}
                    </p>
                  </div>
                </div>

                {/* Tagline */}
                <div className="p-3 rounded-lg bg-stone-50/80">
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Tagline</p>
                  <p className="text-sm italic text-stone-600">{requirements.tagline}</p>
                </div>

                {/* Problem */}
                <div className="flex items-start justify-between p-3 rounded-lg bg-stone-50/80">
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Problem</p>
                    {editingField === "problemStatement" ? (
                      <div className="space-y-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => saveEdit("problemStatement")}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-medium">{requirements.problemStatement}</p>
                    )}
                  </div>
                  {editingField !== "problemStatement" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit("problemStatement", requirements.problemStatement)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Core Action */}
                <div className="p-3 rounded-lg bg-stone-50/80">
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Core Action</p>
                  <p className="font-medium text-sm">{requirements.coreAction}</p>
                </div>

                {/* Primary User */}
                <div className="p-3 rounded-lg bg-stone-50/80">
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Primary User</p>
                  <p className="font-medium text-sm">{requirements.primaryUser.type}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{requirements.primaryUser.coreNeed}</p>
                </div>

                {/* Secondary Users — editable */}
                <div className="p-3 rounded-lg bg-stone-50/80">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">Additional User Roles</p>
                      <p className="text-[11px] text-stone-400">e.g. admins, sellers, managers — if your app has them</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={addSecondaryUser}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {requirements.secondaryUsers.map((u, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {editingField === `user-${i}` ? (
                          <div className="flex-1 space-y-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="User type"
                              className="h-7 text-sm"
                            />
                            <Input
                              value={editValue.includes("||") ? editValue.split("||")[1] : u.coreNeed}
                              onChange={(e) => {
                                const name = editValue.includes("||") ? editValue.split("||")[0] : editValue;
                                setEditValue(`${name}||${e.target.value}`);
                              }}
                              placeholder="Core need"
                              className="h-7 text-sm"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => {
                                const parts = editValue.split("||");
                                saveUserEdit(i, parts[0], parts[1] || u.coreNeed);
                              }}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{u.type}</p>
                              {u.coreNeed && (
                                <p className="text-[11px] text-stone-400">{u.coreNeed}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingField(`user-${i}`); setEditValue(u.type); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeSecondaryUser(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    {requirements.secondaryUsers.length === 0 && (
                      <p className="text-[12px] text-stone-400 italic">None — most apps only need one user type</p>
                    )}
                  </div>
                </div>

                {/* Key Features — editable */}
                <div className="p-3 rounded-lg bg-stone-50/80">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">Key Features</p>
                    <Button variant="ghost" size="sm" onClick={addFeature}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {requirements.keyFeatures.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {editingField === `feature-${i}` ? (
                          <div className="flex-1 flex gap-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Feature"
                              className="h-7 text-sm flex-1"
                            />
                            <Button size="sm" variant="ghost" onClick={() => saveFeatureEdit(i, editValue)}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 px-2.5 py-1 text-[12px] rounded-lg bg-stone-100 text-stone-700 font-medium">
                              {f}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingField(`feature-${i}`); setEditValue(f); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeFeature(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                {(requirements.constraints.mustHave.length > 0 || requirements.constraints.mustNotHave.length > 0) && (
                  <div className="p-3 rounded-lg bg-stone-50/80">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">Constraints</p>
                    {requirements.constraints.mustHave.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[11px] text-stone-500 mb-1">Must have:</p>
                        <div className="flex flex-wrap gap-1">
                          {requirements.constraints.mustHave.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 text-[12px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {requirements.constraints.mustNotHave.length > 0 && (
                      <div>
                        <p className="text-[11px] text-stone-500 mb-1">Must not have:</p>
                        <div className="flex flex-wrap gap-1">
                          {requirements.constraints.mustNotHave.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 text-[12px] rounded-md bg-red-50 text-red-700 border border-red-200">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dev Agent Notes */}
                {requirements.devAgentNotes && (
                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/60">
                    <p className="text-[11px] uppercase tracking-wider text-amber-600 mb-1.5 font-medium">Notes for Dev Agent</p>
                    <p className="text-[12px] text-amber-800">{requirements.devAgentNotes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-stone-200/60">
                  <button
                    onClick={handleStartOver}
                    disabled={loading}
                    className="text-[13px] text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                  >
                    Start over
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="inline-flex items-center gap-2 h-9 px-5 bg-stone-800 text-white text-[13px] font-medium rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {loading ? "Processing..." : "Find My Template"}
                    {!loading && <span>&rarr;</span>}
                  </button>
                </div>
              </motion.div>
            )}
          </AIConversation>
        </div>

        {/* Input area — pinned to bottom */}
        {phase !== "summary" && (
          <div className="shrink-0 border-t border-stone-200/60 bg-white/50 backdrop-blur-xl">
            <div className="max-w-2xl mx-auto p-4 px-6">
              {/* Example idea chips for seed phase */}
              {phase === "seed" && (!messages || messages.length === 0) && !currentInput && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {exampleIdeas.map((idea) => (
                    <button
                      key={idea}
                      onClick={() => setCurrentInput(idea)}
                      className="px-3.5 py-1.5 text-[12px] rounded-full border border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-400 hover:bg-white/80 transition-all duration-200"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              )}

              {showTextInput && (
                <MagicTextarea
                  value={currentInput}
                  onChange={setCurrentInput}
                  onSubmit={
                    phase === "seed" && (!messages || messages.length === 0)
                      ? handleSubmitIdea
                      : () => {
                          if (currentInput.trim()) {
                            handleAnswer(currentInput.trim());
                          }
                        }
                  }
                  placeholder={
                    phase === "seed" && (!messages || messages.length === 0)
                      ? "I want to build an app that..."
                      : "Type your answer..."
                  }
                  maxLength={phase === "seed" && (!messages || messages.length === 0) ? 500 : undefined}
                  loading={loading}
                  submitLabel={phase === "seed" && (!messages || messages.length === 0) ? "Let's Go!" : "Send"}
                />
              )}

              {/* Finish early option */}
              {phase === "conversation" && !isComplete && messages && messages.length > 0 && (
                <div className="mt-2 text-center">
                  <button
                    onClick={handleFinishEarly}
                    disabled={loading}
                    className="text-[12px] text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                  >
                    I&apos;ve shared enough, let&apos;s see templates &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

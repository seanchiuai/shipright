"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { ArrowLeft, Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  ChatMessage,
  ChoiceCard,
  ChoiceGrid,
  MagicTextarea,
  AIConversation,
} from "@/components/interview";

type Requirements = {
  appName: string;
  problemStatement: string;
  userTypes: Array<{ name: string; description: string; isAdmin: boolean }>;
  auth: {
    needed: boolean;
    methods: string[];
    hasRoles: boolean;
    hasOrgs: boolean;
  };
  database: { needed: boolean; realtime: boolean };
  payments: { needed: boolean; model?: string };
  features: Array<{ name: string; description: string; priority: string }>;
  integrations: string[];
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
        if (result.isComplete || newExchangeCount >= 10) {
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
      router.push(`/project/${projectId}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, updateStatus, router]);

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

  const saveFeatureEdit = async (index: number, name: string, description: string) => {
    if (!requirements) return;
    const updated = { ...requirements, features: [...requirements.features] };
    updated.features[index] = { ...updated.features[index], name, description };
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  };

  const addFeature = async () => {
    if (!requirements) return;
    const updated = {
      ...requirements,
      features: [...requirements.features, { name: "New Feature", description: "", priority: "could" as const }],
    };
    await updateRequirements({ projectId, requirements: updated });
  };

  const removeFeature = async (index: number) => {
    if (!requirements) return;
    const updated = { ...requirements, features: requirements.features.filter((_, i) => i !== index) };
    await updateRequirements({ projectId, requirements: updated });
  };

  const saveUserTypeEdit = async (index: number, name: string, description: string) => {
    if (!requirements) return;
    const updated = { ...requirements, userTypes: [...requirements.userTypes] };
    updated.userTypes[index] = { ...updated.userTypes[index], name, description };
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  };

  const addUserType = async () => {
    if (!requirements) return;
    const updated = {
      ...requirements,
      userTypes: [...requirements.userTypes, { name: "New User", description: "", isAdmin: false }],
    };
    await updateRequirements({ projectId, requirements: updated });
  };

  const removeUserType = async (index: number) => {
    if (!requirements) return;
    const updated = { ...requirements, userTypes: requirements.userTypes.filter((_, i) => i !== index) };
    await updateRequirements({ projectId, requirements: updated });
  };

  // Loading state
  if (!isLoaded || convexUser === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading your project...</span>
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
        <p className="text-muted-foreground">Project not found</p>
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Warm background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(135deg, #faf9f7 0%, #f5f0e8 50%, #f0ebe3 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(28, 25, 23, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(28, 25, 23, 0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="hidden sm:block w-px h-5 bg-border/50" />
            <div className="hidden sm:flex items-center gap-2">
              <Image src="/logo.png" alt="ShipRight" width={28} height={28} className="w-7 h-7" />
              <span className="font-serif text-lg font-medium tracking-tight">ShipRight</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 ring-2 ring-border hover:ring-foreground/20 transition-all",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <AIConversation className="max-w-2xl mx-auto px-6 py-10 pb-6">
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
                          className="mt-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
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
                            <ChoiceCard
                              label="Something else"
                              selected={false}
                              onClick={() => setCustomInputMode(true)}
                              icon={<Pencil className="w-4 h-4" />}
                              multiSelect={msg.questionType === "multiselect"}
                              delay={(msg.options?.length ?? 0) * 0.04}
                            />
                          )}
                          {msg.questionType === "multiselect" && (
                            <motion.div
                              className="mt-3 flex justify-end"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <button
                                onClick={() => handleAnswer(multiselectValue)}
                                disabled={multiselectValue.length === 0}
                                className="inline-flex items-center gap-1.5 h-8 px-4 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="flex gap-3 items-center self-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-8 h-8 rounded-full bg-white border border-border/50 shadow-sm flex items-center justify-center">
                  <Image src="/logo.png" alt="ShipRight" width={24} height={24} className="w-5 h-5 object-contain" />
                </div>
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-muted-foreground/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Requirements summary */}
            {phase === "summary" && requirements && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="font-serif text-xl font-medium">Here&apos;s what I understood</h3>

                {/* App Name */}
                <div className="flex items-start justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">App Name</p>
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

                {/* Problem */}
                <div className="flex items-start justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Problem</p>
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

                {/* Features — editable */}
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Features</p>
                    <Button variant="ghost" size="sm" onClick={addFeature}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {requirements.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {editingField === `feature-${i}` ? (
                          <div className="flex-1 space-y-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Feature name"
                              className="h-7 text-sm"
                            />
                            <Input
                              value={editValue.includes("||") ? editValue.split("||")[1] : f.description}
                              onChange={(e) => {
                                const name = editValue.includes("||") ? editValue.split("||")[0] : editValue;
                                setEditValue(`${name}||${e.target.value}`);
                              }}
                              placeholder="Description"
                              className="h-7 text-sm"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => {
                                const parts = editValue.split("||");
                                saveFeatureEdit(i, parts[0], parts[1] || f.description);
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
                              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                                {f.name}
                              </span>
                              {f.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-2">{f.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingField(`feature-${i}`); setEditValue(f.name); }}>
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

                {/* User Types — editable */}
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">User Types</p>
                    <Button variant="ghost" size="sm" onClick={addUserType}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {requirements.userTypes.map((u, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {editingField === `userType-${i}` ? (
                          <div className="flex-1 space-y-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="User type name"
                              className="h-7 text-sm"
                            />
                            <Input
                              value={editValue.includes("||") ? editValue.split("||")[1] : u.description}
                              onChange={(e) => {
                                const name = editValue.includes("||") ? editValue.split("||")[0] : editValue;
                                setEditValue(`${name}||${e.target.value}`);
                              }}
                              placeholder="Description"
                              className="h-7 text-sm"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => {
                                const parts = editValue.split("||");
                                saveUserTypeEdit(i, parts[0], parts[1] || u.description);
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
                              <p className="font-medium text-sm">{u.name}</p>
                              {u.description && (
                                <p className="text-xs text-muted-foreground">{u.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingField(`userType-${i}`); setEditValue(u.name); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeUserType(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Read-only fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Auth</p>
                    <p className="font-medium text-sm">
                      {requirements.auth.needed
                        ? requirements.auth.methods.join(", ") || "Required"
                        : "None"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Database</p>
                    <p className="font-medium text-sm">
                      {requirements.database.needed
                        ? requirements.database.realtime ? "Realtime" : "Standard"
                        : "None"}
                    </p>
                  </div>
                </div>

                {requirements.payments.needed && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Payments</p>
                    <p className="font-medium text-sm">{requirements.payments.model || "Required"}</p>
                  </div>
                )}

                {requirements.integrations.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Integrations</p>
                    <div className="flex flex-wrap gap-1">
                      {requirements.integrations.map((int, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t border-border/30">
                  <button
                    onClick={handleStartOver}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Start over
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="inline-flex items-center gap-2 h-9 px-5 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
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
          <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-md">
            <div className="max-w-2xl mx-auto p-4 px-6">
              {/* Example idea chips for seed phase */}
              {phase === "seed" && (!messages || messages.length === 0) && !currentInput && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {exampleIdeas.map((idea) => (
                    <button
                      key={idea}
                      onClick={() => setCurrentInput(idea)}
                      className="px-3 py-1.5 text-xs rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
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
                    className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
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

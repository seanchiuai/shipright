"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { AppNavbar } from "@/components/app-navbar";
import {
  ChatMessage,
  ChoiceGrid,
  ComparisonGrid,
  AIConversation,
  LoadingDots,
  BlueprintPreview,
  SectionProgress,
  InterviewInputArea,
} from "@/components/interview";
import { Requirements } from "@/lib/types";

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
  const clearIsComplete = useMutation(api.interviews.clearIsComplete);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);
  const continueConversation = useAction(api.ai.continueConversation);
  const extractRequirements = useAction(api.ai.extractRequirements);
  const updateInterviewPhase = useMutation(api.projects.updateInterviewPhase);
  const updateStatus = useMutation(api.projects.updateStatus);

  // State
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTypewriterDone, setIsTypewriterDone] = useState(true);
  const [multiselectValue, setMultiselectValue] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const showError = useCallback((e: unknown, fallback = "Something went wrong. Please try again.") => {
    let msg: string;
    if (e instanceof ConvexError) {
      msg = typeof (e as ConvexError<string>).data === "string" ? (e as ConvexError<string>).data : fallback;
    } else if (e instanceof Error) {
      msg = e.message;
    } else {
      msg = fallback;
    }
    const clean = msg.replace(/^Uncaught Error:\s*/i, "").replace(/^Error:\s*/i, "");
    setError(clean);
    toast.error(clean);
    Sentry.captureException(e instanceof Error ? e : new Error(clean), {
      tags: { feature: "interview", projectId },
    });
  }, [projectId]);

  // Track which AI message IDs we've already seen (for typewriter)
  const seenAiMessages = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const phase = project?.interviewPhase || "seed";
  const isComplete = useMemo(() => messages?.some((m) => m.isComplete), [messages]);
  const lastAiMsg = useMemo(() => messages?.filter((m) => m.role === "assistant").at(-1), [messages]);
  const requirements = project?.requirements as Requirements | undefined;

  // Get section progress from latest AI message
  const latestSectionProgress = useMemo(() => {
    const aiMessages = messages?.filter((m) => m.role === "assistant") || [];
    for (let i = aiMessages.length - 1; i >= 0; i--) {
      if (aiMessages[i].sectionProgress) return aiMessages[i].sectionProgress as Record<string, string>;
    }
    return null;
  }, [messages]);

  const latestCurrentSection = useMemo(() => {
    const aiMessages = messages?.filter((m) => m.role === "assistant") || [];
    for (let i = aiMessages.length - 1; i >= 0; i--) {
      if (aiMessages[i].currentSection) return aiMessages[i].currentSection;
    }
    return null;
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length, loading]);

  // Mark existing messages as seen on first load
  useEffect(() => {
    if (messages && seenAiMessages.current.size === 0 && messages.length > 0) {
      const aiMessages = messages.filter((m) => m.role === "assistant");
      for (let i = 0; i < aiMessages.length - 1; i++) {
        seenAiMessages.current.add(aiMessages[i]._id);
      }
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
        setError(null);
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
          showError(e, "Failed to start conversation. Please refresh and try again.");
          autoTriggered.current = false;
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, project?.appIdea, messages?.length]);

  const handleSubmitIdea = useCallback(async () => {
    if (!currentInput.trim() || loading || submittingRef.current) return;
    const idea = currentInput.trim();
    submittingRef.current = true;
    setLoading(true);
    setCurrentInput("");
    setError(null);

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
      showError(e, "Failed to send your idea. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [currentInput, loading, projectId, addMessage, updateAppIdea, continueConversation, showError]);

  const handleAnswer = useCallback(
    async (answer: string | string[]) => {
      const currentMessages = messagesRef.current;
      if (loading || submittingRef.current || !project?.appIdea || !currentMessages) return;
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

      submittingRef.current = true;
      setLoading(true);
      setCurrentInput("");
      setMultiselectValue([]);
      setError(null);

      try {
        await addMessage({ projectId, role: "user", content: answerText });

        const history = [
          ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: answerText },
        ];

        seenAiMessages.current.clear();
        currentMessages.filter((m) => m.role === "assistant").forEach((m) => {
          seenAiMessages.current.add(m._id);
        });

        const currentExchangeCount = currentMessages.filter((m) => m.role === "user").length;
        const result = await continueConversation({
          projectId,
          appIdea: project.appIdea,
          history,
          exchangeCount: currentExchangeCount + 1,
        });

        if (result.isComplete) {
          try {
            await extractRequirements({ projectId });
          } catch (extractErr) {
            showError(extractErr, "Failed to extract requirements. You can finish early to retry.");
          }
        }
      } catch (e) {
        showError(e, "Failed to process your answer. Please try again.");
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    [loading, project?.appIdea, projectId, addMessage, continueConversation, extractRequirements, showError]
  );

  const handleFinishEarly = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await extractRequirements({ projectId });
    } catch (e) {
      showError(e, "Failed to extract requirements. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, extractRequirements, showError]);

  const handleContinueConversation = useCallback(async () => {
    const currentMessages = messagesRef.current;
    if (loading || !project?.appIdea || !currentMessages) return;
    setLoading(true);
    setError(null);
    try {
      await clearIsComplete({ projectId });
      await updateInterviewPhase({ projectId, phase: "conversation" });

      seenAiMessages.current.clear();
      currentMessages.filter((m) => m.role === "assistant").forEach((m) => {
        seenAiMessages.current.add(m._id);
      });

      const history = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: "[SYSTEM] The user wants to keep going. Ask the next most useful question to refine the app requirements — don't ask what they want to discuss." },
      ];

      await continueConversation({
        projectId,
        appIdea: project.appIdea,
        history,
      });
    } catch (e) {
      showError(e, "Failed to continue conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId, loading, project?.appIdea, clearIsComplete, updateInterviewPhase, continueConversation, showError]);

  const handleGenerateBlueprint = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await updateStatus({ projectId, status: "generating_blueprint" });
      router.push(`/project/${projectId}`);
    } catch (e) {
      showError(e, "Failed to start blueprint generation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId, updateStatus, router, showError]);

  // Loading state
  if (!isLoaded || convexUser === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="dark">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground/70 rounded-full animate-spin" />
          <span className="text-[13px] text-muted-foreground">Loading your project...</span>
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
        <p className="text-[14px] text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" data-theme="dark">
      {/* Dark background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(168deg, #06080d 0%, #0a0e1a 40%, #0c1018 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <AppNavbar title={project?.name} />

      {/* Section progress bar */}
      {phase === "conversation" && !isComplete && (
        <SectionProgress
          currentSection={latestCurrentSection}
          sectionProgress={latestSectionProgress as Record<string, "complete" | "partial" | "not_started"> | null}
        />
      )}

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

                return (
                  <ChatMessage
                    key={msg._id}
                    message={msg.content}
                    isAI={isAI}
                    delay={isAI ? 0.2 : 0}
                    userImageUrl={!isAI ? clerkUser.imageUrl : undefined}
                  >
                    {/* Choice/multiselect options */}
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
                          <p className="pt-1.5 text-[11px] text-muted-foreground italic">
                            Answer in text box below if none apply
                          </p>
                          {msg.questionType === "multiselect" && multiselectValue.length > 0 && (
                            <motion.div
                              className="pt-2 flex justify-end"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <button
                                onClick={() => handleAnswer(multiselectValue)}
                                disabled={multiselectValue.length === 0}
                                className="inline-flex items-center gap-1.5 h-8 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Continue
                              </button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                    {/* Comparison cards (rich choice with descriptions) */}
                    {isAI &&
                      msg._id === lastAiMsg?._id &&
                      !isComplete &&
                      msg.questionType === "comparison" &&
                      msg.options &&
                      msg.optionDescriptions &&
                      isTypewriterDone && (
                        <motion.div
                          className="mt-5 space-y-2"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                          <ComparisonGrid
                            options={msg.options}
                            descriptions={msg.optionDescriptions}
                            selected=""
                            onChange={(val) => handleAnswer(val)}
                          />
                          <p className="pt-1.5 text-[11px] text-muted-foreground italic">
                            Or describe your own approach below
                          </p>
                        </motion.div>
                      )}
                  </ChatMessage>
                );
              })}
            </AnimatePresence>

            {/* Error banner with retry */}
            {error && !loading && (
              <motion.div
                className="mx-auto max-w-md my-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-[12px] font-medium text-red-300 hover:text-red-200 transition-colors underline underline-offset-2"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {/* Loading indicator */}
            {loading && <LoadingDots />}

            {/* Blueprint preview (replaces old RequirementsSummary) */}
            {phase === "summary" && requirements && (
              <BlueprintPreview
                requirements={requirements}
                loading={loading}
                onGenerate={handleGenerateBlueprint}
                onContinueConversation={handleContinueConversation}
              />
            )}
          </AIConversation>
        </div>

        {/* Input area — pinned to bottom */}
        <InterviewInputArea
          phase={phase}
          hasMessages={!!messages && messages.length > 0}
          currentInput={currentInput}
          loading={loading}
          isComplete={!!isComplete}
          onInputChange={setCurrentInput}
          onSubmitIdea={handleSubmitIdea}
          onAnswer={(answer) => handleAnswer(answer)}
          onFinishEarly={handleFinishEarly}
        />
      </main>
    </div>
  );
}

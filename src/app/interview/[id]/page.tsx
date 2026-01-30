"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { AppNavbar } from "@/components/app-navbar";
import {
  ChatMessage,
  ChoiceGrid,
  AIConversation,
  LoadingDots,
  RequirementsSummary,
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
  const updateRequirements = useMutation(api.projects.updateRequirements);
  const updateStatus = useMutation(api.projects.updateStatus);

  // State
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTypewriterDone, setIsTypewriterDone] = useState(true);
  const [multiselectValue, setMultiselectValue] = useState<string[]>([]);

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

      try {
        await addMessage({ projectId, role: "user", content: answerText });

        const history = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: answerText },
        ];

        seenAiMessages.current.clear();
        messages.filter((m) => m.role === "assistant").forEach((m) => {
          seenAiMessages.current.add(m._id);
        });

        const result = await continueConversation({
          projectId,
          appIdea: project.appIdea,
          history,
        });

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

  const handleContinueConversation = useCallback(async () => {
    if (loading || !project?.appIdea || !messages) return;
    setLoading(true);
    try {
      await clearIsComplete({ projectId });
      await updateInterviewPhase({ projectId, phase: "conversation" });

      seenAiMessages.current.clear();
      messages.filter((m) => m.role === "assistant").forEach((m) => {
        seenAiMessages.current.add(m._id);
      });

      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: "[The user reviewed the requirements summary and wants to continue the conversation to clarify or adjust something]" },
      ];

      await continueConversation({
        projectId,
        appIdea: project.appIdea,
        history,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, loading, project?.appIdea, messages, clearIsComplete, updateInterviewPhase, continueConversation]);

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

  const handleUpdateRequirements = useCallback(async (updated: Requirements) => {
    await updateRequirements({ projectId, requirements: updated });
  }, [projectId, updateRequirements]);

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
                          <p className="pt-1.5 text-[11px] text-stone-400 italic">
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
            {loading && <LoadingDots />}

            {/* Requirements summary */}
            {phase === "summary" && requirements && (
              <RequirementsSummary
                requirements={requirements}
                projectId={projectId}
                loading={loading}
                onConfirm={handleConfirm}
                onContinueConversation={handleContinueConversation}
                onUpdateRequirements={handleUpdateRequirements}
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

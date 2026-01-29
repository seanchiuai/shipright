"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import {
  ChatMessage,
  ChoiceGrid,
  MagicTextarea,
  CelebrationBurst,
  EncouragementToast,
  AIConversation,
} from "@/components/interview";

type Question = {
  id: string;
  question: string;
  type: "text" | "choice" | "multiselect";
  options?: string[];
  required?: boolean;
};

type Message = {
  id: string;
  type: "ai" | "user";
  content: string;
  questionData?: Question;
};

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
  const interviewRounds = useQuery(api.interviews.getRounds, { projectId });

  // Actions and mutations
  const updateAppIdea = useMutation(api.projects.updateAppIdea);
  const generateQuestions = useAction(api.ai.generateInterviewQuestions);
  const generateEncouragement = useAction(api.ai.generateEncouragement);
  const generateCompletionMessage = useAction(api.ai.generateCompletionMessage);
  const saveAnswers = useMutation(api.interviews.saveAnswers);
  const updateInterviewStep = useMutation(api.projects.updateInterviewStep);
  const extractRequirements = useAction(api.ai.extractRequirements);
  const resetInterview = useMutation(api.projects.resetInterview);
  const updateRequirements = useMutation(api.projects.updateRequirements);
  const updateStatus = useMutation(api.projects.updateStatus);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [isTypewriterDone, setIsTypewriterDone] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const currentStep = project?.interviewStep || 1;
  const currentRound = project?.interviewRound || 1;

  // Auto-generate questions if arriving with an appIdea but no questions yet (from dashboard submit)
  useEffect(() => {
    if (
      currentStep === 1 &&
      project?.appIdea &&
      messages.length === 0 &&
      questions.length === 0 &&
      !loading
    ) {
      (async () => {
        setLoading(true);
        setMessages([
          { id: `idea-${Date.now()}`, type: "user", content: project.appIdea! },
        ]);
        try {
          const result = await generateQuestions({
            projectId,
            appIdea: project.appIdea!,
            round: 1,
          });
          setMessages((prev) => [
            ...prev,
            { id: "preamble-1", type: "ai", content: result.preamble },
          ]);
          setQuestions(result.questions as Question[]);
          setCurrentQuestionIndex(0);
          setAnswers({});
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: "ai",
              content: `Oops, something went wrong. Let's try again! ${e instanceof Error ? e.message : ""}`,
            },
          ]);
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, project?.appIdea]);

  // Initialize from existing data on step 2
  useEffect(() => {
    if (currentStep === 2 && interviewRounds && messages.length === 0) {
      const currentSession = interviewRounds.find((r: { round: number; preamble?: string }) => r.round === currentRound);
      if (currentSession?.questions) {
        const loadedQuestions = currentSession.questions as Question[];
        // Show stored preamble if available
        if (currentSession.preamble) {
          setMessages([{
            id: `preamble-${currentRound}`,
            type: "ai",
            content: currentSession.preamble,
          }]);
        }
        setQuestions(loadedQuestions);
        setIsTypewriterDone(true);
        if (currentSession.answers) {
          setAnswers(currentSession.answers as Record<string, string | string[]>);
        }
      }
    }
  }, [currentStep, currentRound, interviewRounds, messages.length]);

  // Show current question as AI message when questions change
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length && isTypewriterDone) {
      const q = questions[currentQuestionIndex];
      const alreadyShown = messages.some((m) => m.id === `question-${q.id}`);
      if (!alreadyShown) {
        setMessages((prev) => [
          ...prev,
          {
            id: `question-${q.id}`,
            type: "ai",
            content: q.question,
            questionData: q,
          },
        ]);
        setIsTypewriterDone(false);
      }
    }
  }, [questions, currentQuestionIndex, messages, isTypewriterDone]);

  const handleSubmitIdea = useCallback(async () => {
    if (!currentInput.trim() || loading) return;
    const idea = currentInput.trim();
    setLoading(true);
    setCurrentInput("");

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `idea-${Date.now()}`, type: "user", content: idea },
    ]);

    try {
      await updateAppIdea({ projectId, appIdea: idea });
      const result = await generateQuestions({
        projectId,
        appIdea: idea,
        round: 1,
      });

      // Add AI preamble
      setMessages((prev) => [
        ...prev,
        { id: `preamble-1`, type: "ai", content: result.preamble },
      ]);

      setQuestions(result.questions as Question[]);
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "ai",
          content: `Oops, something went wrong. Let's try again! ${e instanceof Error ? e.message : ""}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentInput, loading, projectId, updateAppIdea, generateQuestions]);

  const handleAnswer = useCallback(
    async (answer: string | string[]) => {
      if (loading) return;
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

      // Add user message
      setMessages((prev) => [
        ...prev,
        { id: `answer-${currentQuestion.id}`, type: "user", content: answerText },
      ]);

      // Update answers
      const newAnswers = { ...answers, [currentQuestion.id]: answer };
      setAnswers(newAnswers);

      // Show celebration
      setShowCelebration(true);

      // Get encouragement from AI (fire and forget for speed)
      if (project?.appIdea) {
        generateEncouragement({
          appIdea: project.appIdea,
          question: currentQuestion.question,
          answer: answerText,
        })
          .then((result) => {
            setEncouragement(result.encouragement);
            setTimeout(() => setEncouragement(null), 2000);
          })
          .catch(() => {});
      }

      // Move to next question or next round
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((i) => i + 1);
        setIsTypewriterDone(true);
      } else {
        // Round complete
        setLoading(true);
        try {
          await saveAnswers({ projectId, round: currentRound, answers: newAnswers });

          if (currentRound < 3) {
            // Get next round
            const previousRounds =
              interviewRounds?.map((r: { questions?: unknown[]; answers?: Record<string, unknown> }) => ({
                questions: r.questions || [],
                answers: r.answers || {},
              })) || [];
            previousRounds.push({ questions, answers: newAnswers });

            const nextRound = currentRound + 1;
            await updateInterviewStep({ projectId, step: 2, round: nextRound });

            const result = await generateQuestions({
              projectId,
              appIdea: project!.appIdea!,
              round: nextRound,
              previousRounds,
            });

            // Add round transition message
            setMessages((prev) => [
              ...prev,
              { id: `preamble-${nextRound}`, type: "ai", content: result.preamble },
            ]);

            setQuestions(result.questions as Question[]);
            setCurrentQuestionIndex(0);
            setAnswers({});
          } else {
            // Final round complete - extract requirements
            await extractRequirements({ projectId });

            // Get completion message
            const completion = await generateCompletionMessage({ projectId });
            setMessages((prev) => [
              ...prev,
              { id: "completion", type: "ai", content: completion.message },
            ]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    },
    [
      loading,
      questions,
      currentQuestionIndex,
      answers,
      project,
      projectId,
      currentRound,
      interviewRounds,
      saveAnswers,
      updateInterviewStep,
      generateQuestions,
      extractRequirements,
      generateCompletionMessage,
      generateEncouragement,
    ]
  );

  const handleFinishEarly = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await saveAnswers({ projectId, round: currentRound, answers });
      await extractRequirements({ projectId });

      const completion = await generateCompletionMessage({ projectId });
      setMessages((prev) => [
        ...prev,
        { id: "completion", type: "ai", content: completion.message },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, currentRound, answers, saveAnswers, extractRequirements, generateCompletionMessage]);

  const handleStartOver = useCallback(async () => {
    setLoading(true);
    try {
      await resetInterview({ projectId });
      setMessages([]);
      setQuestions([]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setCurrentInput("");
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
    if (!project?.requirements) return;
    const updated = { ...project.requirements };
    if (field === "appName") updated.appName = editValue;
    else if (field === "problemStatement") updated.problemStatement = editValue;
    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
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

  const requirements = project?.requirements as Requirements | undefined;
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <CelebrationBurst
        trigger={showCelebration}
        onComplete={() => setShowCelebration(false)}
        intensity="subtle"
      />
      <EncouragementToast
        message={encouragement || ""}
        show={!!encouragement}
        onComplete={() => setEncouragement(null)}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-white">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <AIConversation className="max-w-3xl mx-auto px-4 py-6 pb-4">
            {/* Step 1: Initial prompt */}
            {currentStep === 1 && messages.length === 0 && (
              <ChatMessage
                message="What's the app you've been dreaming about? Tell me everything - who it's for, what problem it solves, what makes it special."
                isAI
                typewriter
                onTypewriterComplete={() => setIsTypewriterDone(true)}
              />
            )}

            {/* Chat messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.content}
                  isAI={msg.type === "ai"}
                  typewriter={msg.type === "ai" && index === messages.length - 1 && !msg.questionData}
                  onTypewriterComplete={() => setIsTypewriterDone(true)}
                  delay={msg.type === "ai" ? 0.2 : 0}
                >
                  {/* Show choice options inline for current question */}
                  {msg.questionData &&
                    msg.id === `question-${currentQuestion?.id}` &&
                    (msg.questionData.type === "choice" || msg.questionData.type === "multiselect") &&
                    msg.questionData.options && (
                      <motion.div
                        className="mt-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <ChoiceGrid
                          options={msg.questionData.options}
                          selected={answers[msg.questionData.id] || (msg.questionData.type === "multiselect" ? [] : "")}
                          onChange={(val) => {
                            if (msg.questionData!.type === "multiselect") {
                              setAnswers({ ...answers, [msg.questionData!.id]: val as string[] });
                            } else {
                              handleAnswer(val);
                            }
                          }}
                          multiSelect={msg.questionData.type === "multiselect"}
                        />
                        {msg.questionData.type === "multiselect" && (
                          <motion.div
                            className="mt-3 flex justify-end"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            <Button
                              size="sm"
                              onClick={() => handleAnswer(answers[msg.questionData!.id] as string[] || [])}
                              disabled={!answers[msg.questionData!.id] || (answers[msg.questionData!.id] as string[]).length === 0}
                            >
                              Continue
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                </ChatMessage>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                className="flex gap-3 items-center self-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </motion.div>
            )}

            {/* Requirements summary */}
            {currentStep === 3 && requirements && (
              <motion.div
                className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="font-semibold text-lg">Here's what I understood</h3>

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

                {/* Other fields (read-only) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Users</p>
                    <p className="font-medium text-sm">
                      {requirements.userTypes.map((u) => u.name).join(", ")}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Auth</p>
                    <p className="font-medium text-sm">
                      {requirements.auth.needed
                        ? requirements.auth.methods.join(", ") || "Required"
                        : "None"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {requirements.features.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={handleStartOver} disabled={loading}>
                    Start Over
                  </Button>
                  <Button onClick={handleConfirm} disabled={loading} className="gap-2">
                    {loading ? "Processing..." : "Find My Template"}
                    {!loading && <span>→</span>}
                  </Button>
                </div>
              </motion.div>
            )}

          </AIConversation>
        </div>

        {/* Input area — pinned to bottom */}
        {currentStep !== 3 && (
          <div className="shrink-0 border-t border-border bg-white">
            <div className="max-w-3xl mx-auto p-4">
              {/* Text input for step 1, or step 2 when current question is text/absent (choice/multiselect use inline cards) */}
              {(currentStep === 1 ||
                (currentStep === 2 && currentQuestion?.type !== "choice" && currentQuestion?.type !== "multiselect")) && (
                <MagicTextarea
                  value={currentInput}
                  onChange={setCurrentInput}
                  onSubmit={
                    currentStep === 1
                      ? handleSubmitIdea
                      : () => {
                          if (currentInput.trim()) {
                            handleAnswer(currentInput.trim());
                            setCurrentInput("");
                          }
                        }
                  }
                  placeholder={
                    currentStep === 1
                      ? "I want to build an app that..."
                      : "Type your answer..."
                  }
                  maxLength={currentStep === 1 ? 500 : undefined}
                  loading={loading}
                  submitLabel={currentStep === 1 ? "Let's Go!" : "Send"}
                />
              )}

              {/* Finish early option */}
              {currentStep === 2 && questions.length > 0 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={handleFinishEarly}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    I've shared enough, let's see templates →
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

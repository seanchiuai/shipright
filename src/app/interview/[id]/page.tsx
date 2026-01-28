"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import { ArrowUp, Sparkles, Check, RotateCcw } from "lucide-react";

type Question = {
  id: string;
  question: string;
  type: "text" | "choice" | "multiselect";
  options?: string[];
  required?: boolean;
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

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  questionData?: Question;
  isTyping?: boolean;
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
  const saveAnswers = useMutation(api.interviews.saveAnswers);
  const updateInterviewStep = useMutation(api.projects.updateInterviewStep);
  const extractRequirements = useAction(api.ai.extractRequirements);
  const resetInterview = useMutation(api.projects.resetInterview);
  const updateRequirements = useMutation(api.projects.updateRequirements);
  const updateStatus = useMutation(api.projects.updateStatus);

  // Local state
  const [appIdea, setAppIdea] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Current step: 1 (app idea), 2 (questions), 3 (summary)
  const currentStep = project?.interviewStep || 1;
  const currentRound = project?.interviewRound || 1;

  // Load existing app idea if present
  useEffect(() => {
    if (project?.appIdea) {
      setAppIdea(project.appIdea);
    }
  }, [project?.appIdea]);

  // Load questions for current round and build chat messages
  useEffect(() => {
    if (currentStep === 2 && interviewRounds) {
      const currentSession = interviewRounds.find((r) => r.round === currentRound);
      if (currentSession?.questions) {
        const loadedQuestions = currentSession.questions as Question[];
        setQuestions(loadedQuestions);

        const loadedAnswers = (currentSession.answers as Record<string, string | string[]>) || {};
        setAnswers(loadedAnswers);

        // Build chat messages from questions and answers
        const messages: ChatMessage[] = [];
        let answeredCount = 0;

        loadedQuestions.forEach((q, idx) => {
          messages.push({
            id: `q-${q.id}`,
            role: "assistant",
            content: q.question,
            questionData: q,
          });

          const answer = loadedAnswers[q.id];
          if (answer !== undefined && answer !== "" && (Array.isArray(answer) ? answer.length > 0 : true)) {
            const answerText = Array.isArray(answer) ? answer.join(", ") : answer;
            messages.push({
              id: `a-${q.id}`,
              role: "user",
              content: answerText,
            });
            answeredCount++;
          }
        });

        setChatMessages(messages);
        setCurrentQuestionIndex(answeredCount);
      }
    }
  }, [currentStep, currentRound, interviewRounds]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when questions change
  useEffect(() => {
    if (currentStep === 2 && !loading) {
      inputRef.current?.focus();
    }
  }, [currentQuestionIndex, currentStep, loading]);

  if (!isLoaded || convexUser === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    router.push("/");
    return null;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // Step 1: Submit app idea
  async function handleSubmitIdea() {
    if (!appIdea.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await updateAppIdea({ projectId, appIdea: appIdea.trim() });
      const result = await generateQuestions({
        projectId,
        appIdea: appIdea.trim(),
        round: 1,
      });
      setQuestions(result.questions as Question[]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setChatMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  }

  // Handle answering current question
  async function handleSubmitAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    let answerValue: string | string[];

    if (currentQuestion.type === "multiselect") {
      if (selectedOptions.length === 0) return;
      answerValue = selectedOptions;
    } else if (currentQuestion.type === "choice") {
      if (selectedOptions.length === 0) return;
      answerValue = selectedOptions[0];
    } else {
      if (!inputValue.trim()) return;
      answerValue = inputValue.trim();
    }

    // Add user message to chat
    const answerText = Array.isArray(answerValue) ? answerValue.join(", ") : answerValue;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `a-${currentQuestion.id}`,
        role: "user",
        content: answerText,
      },
    ]);

    // Update answers
    const newAnswers = { ...answers, [currentQuestion.id]: answerValue };
    setAnswers(newAnswers);
    setInputValue("");
    setSelectedOptions([]);

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered, process round
      await handleRoundComplete(newAnswers);
    }
  }

  // Handle round completion
  async function handleRoundComplete(finalAnswers: Record<string, string | string[]>) {
    setLoading(true);
    setError(null);

    try {
      await saveAnswers({ projectId, round: currentRound, answers: finalAnswers });

      if (currentRound < 3) {
        // Get previous rounds for context
        const previousRounds =
          interviewRounds?.map((r) => ({
            questions: r.questions || [],
            answers: r.answers || {},
          })) || [];

        previousRounds.push({ questions, answers: finalAnswers });

        const nextRound = currentRound + 1;
        await updateInterviewStep({ projectId, step: 2, round: nextRound });

        const result = await generateQuestions({
          projectId,
          appIdea: project!.appIdea!,
          round: nextRound,
          previousRounds,
        });

        setQuestions(result.questions as Question[]);
        setAnswers({});
        setCurrentQuestionIndex(0);
        setChatMessages([]);
      } else {
        await extractRequirements({ projectId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process answers");
    } finally {
      setLoading(false);
    }
  }

  // Finish early
  async function handleFinishEarly() {
    setLoading(true);
    setError(null);

    try {
      // Save current answers
      await saveAnswers({ projectId, round: currentRound, answers });
      await extractRequirements({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract requirements");
    } finally {
      setLoading(false);
    }
  }

  // Start over
  async function handleStartOver() {
    setLoading(true);
    try {
      await resetInterview({ projectId });
      setAppIdea("");
      setQuestions([]);
      setAnswers({});
      setChatMessages([]);
      setCurrentQuestionIndex(0);
    } finally {
      setLoading(false);
    }
  }

  // Confirm and proceed
  async function handleConfirm() {
    setLoading(true);
    try {
      await updateStatus({ projectId, status: "matching" });
      router.push(`/project/${projectId}`);
    } finally {
      setLoading(false);
    }
  }

  // Edit requirement field
  function startEdit(field: string, value: string) {
    setEditingField(field);
    setEditValue(value);
  }

  async function saveEdit(field: string) {
    if (!project?.requirements) return;

    const updated = { ...project.requirements };
    if (field === "appName") updated.appName = editValue;
    else if (field === "problemStatement") updated.problemStatement = editValue;

    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  }

  const requirements = project?.requirements as Requirements | undefined;
  const currentQuestion = questions[currentQuestionIndex];

  // Handle option selection for choice/multiselect
  function handleOptionSelect(option: string) {
    if (!currentQuestion) return;

    if (currentQuestion.type === "choice") {
      setSelectedOptions([option]);
    } else if (currentQuestion.type === "multiselect") {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      );
    }
  }

  // Handle key press in input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#faf9f7]/80 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-lg font-medium">Shipright</span>
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <span className="text-xs text-muted-foreground">
                Round {currentRound}/3
              </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: App Idea */}
      {currentStep === 1 && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium mb-2">
                What do you want to build?
              </h1>
              <p className="text-muted-foreground">
                Describe your app idea in a sentence or two.
              </p>
            </div>

            <div className="relative">
              <Textarea
                value={appIdea}
                onChange={(e) => setAppIdea(e.target.value)}
                placeholder="I want to build an app where..."
                maxLength={500}
                rows={4}
                className="resize-none bg-white border-border/60 focus:border-primary/50 rounded-xl pr-4 pb-10"
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {appIdea.length}/500
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmitIdea}
                  disabled={loading || !appIdea.trim()}
                  className="rounded-lg"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowUp className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              <p className="font-medium mb-1">Examples:</p>
              <p>&quot;...people can share and discover book recommendations&quot;</p>
              <p>&quot;...freelancers can track their time and invoices&quot;</p>
            </div>
          </div>
        </main>
      )}

      {/* Step 2: Chat Interface */}
      {currentStep === 2 && questions.length > 0 && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              {/* App idea context */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  Building: <span className="text-foreground">{project.appIdea}</span>
                </p>
              </div>

              {/* Chat messages */}
              {chatMessages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-white border border-border/60 rounded-2xl rounded-bl-md"
                    } px-4 py-3 shadow-sm`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Current question (if not yet in messages) */}
              {currentQuestion && !chatMessages.find((m) => m.id === `a-${currentQuestion.id}`) && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <p className="text-sm leading-relaxed">{currentQuestion.question}</p>

                    {/* Options for choice/multiselect */}
                    {(currentQuestion.type === "choice" || currentQuestion.type === "multiselect") &&
                      currentQuestion.options && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {currentQuestion.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleOptionSelect(opt)}
                              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                                selectedOptions.includes(opt)
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white border-border/60 hover:border-primary/50 hover:bg-primary/5"
                              }`}
                            >
                              {selectedOptions.includes(opt) && (
                                <Check className="w-3 h-3 inline mr-1" />
                              )}
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </main>

          {/* Input area */}
          <div className="sticky bottom-0 bg-[#faf9f7]/80 backdrop-blur-md border-t border-border/50">
            <div className="max-w-2xl mx-auto px-4 py-4">
              {/* For text questions or after selecting options */}
              {currentQuestion && (
                <div className="flex items-end gap-2">
                  {currentQuestion.type === "text" ? (
                    <Textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer..."
                      rows={1}
                      disabled={loading}
                      className="flex-1 resize-none bg-white border-border/60 focus:border-primary/50 rounded-xl min-h-[44px] max-h-32"
                    />
                  ) : (
                    <div className="flex-1 text-sm text-muted-foreground py-2">
                      {selectedOptions.length > 0
                        ? `Selected: ${selectedOptions.join(", ")}`
                        : "Select an option above"
                      }
                    </div>
                  )}
                  <Button
                    size="icon"
                    onClick={handleSubmitAnswer}
                    disabled={
                      loading ||
                      (currentQuestion.type === "text" ? !inputValue.trim() : selectedOptions.length === 0)
                    }
                    className="rounded-xl h-11 w-11 shrink-0"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Progress and finish early button */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <button
                  onClick={handleFinishEarly}
                  disabled={loading || Object.keys(answers).length === 0}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  Finish early & summarize
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Requirements Summary */}
      {currentStep === 3 && requirements && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl font-medium mb-2">
                Here&apos;s what we understood
              </h1>
              <p className="text-muted-foreground text-sm">
                Review and edit anything before we find your template.
              </p>
            </div>

            {/* App Name */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">App Name</p>
                  {editingField === "appName" ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => saveEdit("appName")}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <p className="font-medium">{requirements.appName}</p>
                  )}
                </div>
                {editingField !== "appName" && (
                  <button
                    onClick={() => startEdit("appName", requirements.appName)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Problem */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Problem</p>
                  {editingField === "problemStatement" ? (
                    <div className="space-y-2 mt-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit("problemStatement")}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{requirements.problemStatement}</p>
                  )}
                </div>
                {editingField !== "problemStatement" && (
                  <button
                    onClick={() => startEdit("problemStatement", requirements.problemStatement)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Users */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Users</p>
              <div className="flex flex-wrap gap-2">
                {requirements.userTypes.map((u, i) => (
                  <span key={i} className="text-sm px-3 py-1 bg-muted/50 rounded-full">
                    {u.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Auth */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Authentication</p>
              <p className="text-sm">
                {requirements.auth.needed
                  ? requirements.auth.methods.join(", ") || "Required"
                  : "None required"}
              </p>
            </div>

            {/* Features */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Features</p>
              <ul className="space-y-1">
                {requirements.features.map((f, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{f.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payments */}
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Payments</p>
              <p className="text-sm">
                {requirements.payments.needed
                  ? requirements.payments.model || "Required"
                  : "None"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleStartOver}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start over
              </button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Confirm & Find Template"
                )}
              </Button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";

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

  // Current step: 1 (app idea), 2 (questions), 3 (summary)
  const currentStep = project?.interviewStep || 1;
  const currentRound = project?.interviewRound || 1;

  // Load existing app idea if present
  useEffect(() => {
    if (project?.appIdea) {
      setAppIdea(project.appIdea);
    }
  }, [project?.appIdea]);

  // Load questions for current round
  useEffect(() => {
    if (currentStep === 2 && interviewRounds) {
      const currentSession = interviewRounds.find((r) => r.round === currentRound);
      if (currentSession?.questions) {
        setQuestions(currentSession.questions as Question[]);
        if (currentSession.answers) {
          setAnswers(currentSession.answers as Record<string, string | string[]>);
        }
      }
    }
  }, [currentStep, currentRound, interviewRounds]);

  if (!isLoaded || convexUser === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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

  const progressValue = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

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
      setQuestions(result.questions);
      setAnswers({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit answers and potentially get more questions
  async function handleSubmitAnswers() {
    setLoading(true);
    setError(null);

    try {
      // Save current answers
      await saveAnswers({ projectId, round: currentRound, answers });

      // Check if we need more rounds
      if (currentRound < 3) {
        // Get previous rounds for context
        const previousRounds =
          interviewRounds?.map((r) => ({
            questions: r.questions || [],
            answers: r.answers || {},
          })) || [];

        // Add current round
        previousRounds.push({ questions, answers });

        // Generate next round of questions
        const nextRound = currentRound + 1;
        await updateInterviewStep({ projectId, step: 2, round: nextRound });

        const result = await generateQuestions({
          projectId,
          appIdea: project!.appIdea!,
          round: nextRound,
          previousRounds,
        });

        setQuestions(result.questions);
        setAnswers({});
      } else {
        // Max rounds reached, extract requirements
        await extractRequirements({ projectId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process answers");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Skip to requirements extraction
  async function handleFinishEarly() {
    setLoading(true);
    setError(null);

    try {
      // Save current answers first
      await saveAnswers({ projectId, round: currentRound, answers });
      // Extract requirements
      await extractRequirements({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract requirements");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Start over
  async function handleStartOver() {
    setLoading(true);
    try {
      await resetInterview({ projectId });
      setAppIdea("");
      setQuestions([]);
      setAnswers({});
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Confirm and proceed to template matching
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
    // Add more fields as needed

    await updateRequirements({ projectId, requirements: updated });
    setEditingField(null);
  }

  const requirements = project?.requirements as Requirements | undefined;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Shipright
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm">
              {clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep} of 3</span>
            {currentStep === 2 && <span>Round {currentRound} of 3</span>}
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: App Idea */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What do you want to build?</CardTitle>
              <CardDescription>
                Describe your app idea in one sentence. Be specific about what users can do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="idea" className="sr-only">
                  App idea
                </Label>
                <Textarea
                  id="idea"
                  value={appIdea}
                  onChange={(e) => setAppIdea(e.target.value)}
                  placeholder="I want to build an app where..."
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2 text-right">
                  {appIdea.length}/500
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Examples:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>&quot;...people can share and discover book recommendations&quot;</li>
                  <li>&quot;...freelancers can track their time and invoices&quot;</li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSubmitIdea} disabled={loading || !appIdea.trim()}>
                  {loading ? "Generating questions..." : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: AI Questions */}
        {currentStep === 2 && questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>A few questions to understand your app better</CardTitle>
              <CardDescription>
                Answer these questions so we can find the best template for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-base">
                    {index + 1}. {q.question}
                    {q.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {q.type === "text" && (
                    <Textarea
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                      placeholder="Your answer..."
                      rows={3}
                    />
                  )}

                  {q.type === "choice" && q.options && (
                    <RadioGroup
                      value={(answers[q.id] as string) || ""}
                      onValueChange={(value) =>
                        setAnswers({ ...answers, [q.id]: value })
                      }
                    >
                      {q.options.map((opt) => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                          <Label htmlFor={`${q.id}-${opt}`} className="font-normal cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === "multiselect" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = ((answers[q.id] as string[]) || []).includes(opt);
                        return (
                          <div key={opt} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`${q.id}-${opt}`}
                              checked={selected}
                              onChange={(e) => {
                                const current = (answers[q.id] as string[]) || [];
                                if (e.target.checked) {
                                  setAnswers({ ...answers, [q.id]: [...current, opt] });
                                } else {
                                  setAnswers({
                                    ...answers,
                                    [q.id]: current.filter((v) => v !== opt),
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-input"
                            />
                            <Label htmlFor={`${q.id}-${opt}`} className="font-normal cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleFinishEarly} disabled={loading}>
                  Finish Early
                </Button>
                <Button onClick={handleSubmitAnswers} disabled={loading}>
                  {loading
                    ? "Processing..."
                    : currentRound < 3
                      ? "Next"
                      : "Review Requirements"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Requirements Summary */}
        {currentStep === 3 && requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Here&apos;s what we understood</CardTitle>
              <CardDescription>
                Review and edit anything that&apos;s wrong before we find your template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* App Name */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">App Name</p>
                  {editingField === "appName" ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => saveEdit("appName")}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingField(null)}
                      >
                        Cancel
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
                    Edit
                  </Button>
                )}
              </div>

              {/* Problem Statement */}
              <div className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Problem</p>
                  {editingField === "problemStatement" ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit("problemStatement")}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingField(null)}
                        >
                          Cancel
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
                    onClick={() =>
                      startEdit("problemStatement", requirements.problemStatement)
                    }
                  >
                    Edit
                  </Button>
                )}
              </div>

              {/* User Types */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Users</p>
                <p className="font-medium">
                  {requirements.userTypes.map((u) => u.name).join(", ")}
                </p>
              </div>

              {/* Auth */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Authentication</p>
                <p className="font-medium">
                  {requirements.auth.needed
                    ? requirements.auth.methods.join(", ") || "Required"
                    : "None required"}
                </p>
              </div>

              {/* Features */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Features</p>
                <ul className="space-y-1">
                  {requirements.features.map((f, i) => (
                    <li key={i} className="font-medium">
                      • {f.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payments */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Payments</p>
                <p className="font-medium">
                  {requirements.payments.needed
                    ? requirements.payments.model || "Required"
                    : "None"}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleStartOver} disabled={loading}>
                  Start Over
                </Button>
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? "Processing..." : "Confirm & Find Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

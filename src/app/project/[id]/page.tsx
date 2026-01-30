"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { AppNavbar } from "@/components/app-navbar";
import { useSyncUser } from "@/hooks/useSyncUser";
import {
  Loader2,
  RefreshCw,
  Package,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  FileText,
  Search,
  Box,
  Code2,
  GitBranch,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PROJECT_STATUS } from "@/lib/constants";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const projectId = params.id as Id<"projects">;

  const convexUser = useSyncUser();
  const project = useQuery(api.projects.get, { projectId });
  const templates = useQuery(api.templates.list, {});

  const matchTemplate = useAction(api.matching.matchTemplate);
  const cloneTemplate = useAction(api.github.cloneTemplate);
  const runScaffolding = useAction(api.scaffolding.runScaffoldingPipeline);
  const resumeAfterChoices = useAction(api.scaffolding.resumeAfterChoices);
  const submitTechChoicesAction = useAction(api.scaffolding.submitTechChoices);
  const resetInterview = useMutation(api.projects.resetInterview);
  const retryRepo = useMutation(api.projects.retryRepoCreation);
  const setRepoFailed = useMutation(api.projects.setRepoFailed);
  const restartRepo = useMutation(api.projects.restartRepoCreation);

  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloneInFlight = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scaffoldingAttempted = useRef(false);
  const [techChoices, setTechChoices] = useState<Record<string, string>>({});

  const matchedTemplate =
    project?.templateId && templates
      ? templates.find((t) => t._id === project.templateId)
      : null;

  useEffect(() => {
    async function runMatching() {
      if (project?.status === "matching" && !matching && !error) {
        setMatching(true);
        setError(null);
        try {
          await matchTemplate({ projectId });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to match template");
        } finally {
          setMatching(false);
        }
      }
    }
    runMatching();
  }, [project?.status, matching, error, matchTemplate, projectId]);

  // Auto-clone when status is "matched"
  useEffect(() => {
    async function runClone() {
      if (project?.status !== "matched") {
        cloneInFlight.current = false;
        return;
      }
      if (cloneInFlight.current) return;
      if (!matchedTemplate || !convexUser) return;

      if (!convexUser.githubToken) {
        router.push(`/connect-github?returnTo=/project/${projectId}`);
        return;
      }

      cloneInFlight.current = true;
      setError(null);

      try {
        const repoName = project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        await cloneTemplate({
          projectId,
          templateSourceUrl: matchedTemplate.sourceUrl,
          newRepoName: repoName || "shipright-app",
        });
      } catch (e) {
        // Error is persisted in DB by the action (status -> repo_failed).
        // Only handle GitHub redirect client-side.
        const message = e instanceof Error ? e.message : "";
        if (message.includes("401") || message.includes("Bad credentials")) {
          router.push(`/connect-github?returnTo=/project/${projectId}`);
        }
        cloneInFlight.current = false;
      }
    }
    runClone();
  }, [project?.status, project?.name, matchedTemplate, convexUser, projectId, cloneTemplate, router]);

  // Elapsed time indicator for loading states
  useEffect(() => {
    const isLoading = project?.status === "matched" ||
      (project?.status === "building" && !project?.scaffoldingStatus);

    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [project?.status, project?.scaffoldingStatus]);

  // Auto-trigger scaffolding when repo is created (status: "building")
  useEffect(() => {
    async function startScaffolding() {
      if (project?.status !== "building") return;
      if (scaffoldingAttempted.current) return;
      if (!project.githubRepoUrl) return;

      scaffoldingAttempted.current = true;
      setError(null);

      try {
        await runScaffolding({ projectId });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Scaffolding failed";
        setError(message);
        scaffoldingAttempted.current = false;
      }
    }
    startScaffolding();
  }, [project?.status, project?.githubRepoUrl, projectId, runScaffolding]);

  async function handleSubmitTechChoices() {
    try {
      setError(null);
      await submitTechChoicesAction({ projectId, choices: techChoices });
      await resumeAfterChoices({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to continue");
    }
  }

  async function handleRetryRepo() {
    try {
      setError(null);
      await retryRepo({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
    }
  }

  async function handleRestartRepo() {
    try {
      cloneInFlight.current = false;
      setError(null);
      await restartRepo({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restart");
    }
  }

  async function handleStartOver() {
    try {
      cloneInFlight.current = false;
      await resetInterview({ projectId });
      router.push(`/interview/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset");
    }
  }

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
      <div className="min-h-screen">
        <AppNavbar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Project not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    [PROJECT_STATUS.INTERVIEW]: "In Interview",
    [PROJECT_STATUS.MATCHING]: "Finding Template",
    [PROJECT_STATUS.MATCHED]: "Creating Repo",
    [PROJECT_STATUS.BUILDING]: "Creating Repo",
    [PROJECT_STATUS.SCAFFOLDING]: "Scaffolding",
    [PROJECT_STATUS.COMPLETE]: "Complete",
    [PROJECT_STATUS.REPO_FAILED]: "Failed",
  };

  const scaffoldingSteps = [
    { key: "generating_prd", label: "Generating PRD", icon: FileText },
    { key: "researching_stack", label: "Researching tech stack", icon: Search },
    { key: "preparing_sandbox", label: "Preparing sandbox", icon: Box },
    { key: "running_sandbox", label: "Running Claude Code", icon: Code2 },
    { key: "pushing_files", label: "Pushing to GitHub", icon: GitBranch },
    { key: "scaffolding_complete", label: "Complete", icon: CheckCircle2 },
  ];

  const scaffoldingStepIndex = project.scaffoldingStatus
    ? scaffoldingSteps.findIndex((s) => s.key === project.scaffoldingStatus)
    : -1;

  const isMatchingInProgress = !error && ([PROJECT_STATUS.MATCHING, PROJECT_STATUS.MATCHED] as string[]).includes(project.status);
  const isBuildingRepo = !error && project.status === PROJECT_STATUS.BUILDING && !project.scaffoldingStatus;
  const isScaffolding = !error && (project.status === PROJECT_STATUS.SCAFFOLDING || (project.status === PROJECT_STATUS.BUILDING && project.scaffoldingStatus));
  const isAwaitingChoices = project.scaffoldingStatus === "awaiting_tech_choices";
  const isScaffoldingFailed = project.scaffoldingStatus === "scaffolding_failed";
  const isInProgress = isMatchingInProgress || isBuildingRepo;

  return (
    <div className="min-h-screen">
      <AppNavbar title={project.name} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/dashboard")}
        >
          &larr; Back to Dashboard
        </Button>

        {/* Transient error display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={handleStartOver} className="gap-2">
                Start Over
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Persistent repo creation error */}
        {project.status === PROJECT_STATUS.REPO_FAILED && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-destructive text-sm">
                  {project.repoError || "Repository creation failed."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Attempt {project.repoRetryCount ?? 1} of 3
                </p>
              </div>
              <div className="flex gap-2">
                {(project.repoRetryCount ?? 0) < 3 ? (
                  <Button variant="outline" size="sm" onClick={handleRetryRepo} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleRestartRepo} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Restart
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress view for matching/matched */}
        {isInProgress && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {project.status === PROJECT_STATUS.MATCHING && "Finding the best template..."}
                  {project.status === PROJECT_STATUS.MATCHED && "Creating your repository..."}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {project.status === PROJECT_STATUS.MATCHING &&
                    "Analyzing your requirements to find the perfect starting point."}
                  {project.status === PROJECT_STATUS.MATCHED &&
                    "Cloning the template and creating your GitHub repository."}
                </p>
                {elapsedSeconds > 30 && elapsedSeconds <= 60 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Taking longer than expected ({elapsedSeconds}s)...
                  </p>
                )}
                {elapsedSeconds > 60 && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-xs text-amber-600">
                      This is taking too long ({elapsedSeconds}s). Something may have gone wrong.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        await setRepoFailed({ projectId, error: "Timed out waiting for repository creation." });
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Cancel &amp; Retry
                    </Button>
                  </div>
                )}

                {/* Template info once matched */}
                {project.status === PROJECT_STATUS.MATCHED &&
                  matchedTemplate && (
                    <div className="w-full max-w-md space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {matchedTemplate.name}
                          </p>
                          {project.matchScore !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {project.matchScore}% match
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tech stack badges */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {matchedTemplate.stack.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scaffolding progress */}
        {isScaffolding && !isAwaitingChoices && !isScaffoldingFailed && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium mb-1">Setting up your project</h3>
                <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
                  Generating scaffolding files so AI can help you build.
                </p>

                <div className="w-full max-w-sm space-y-3">
                  {scaffoldingSteps.slice(0, -1).map((step, i) => {
                    const Icon = step.icon;
                    const isActive = step.key === project.scaffoldingStatus;
                    const isDone = scaffoldingStepIndex > i;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone ? "bg-green-500/10" : isActive ? "bg-primary/10" : "bg-muted"
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          isDone ? "text-green-600" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tech choices dialog */}
        {isAwaitingChoices && project.techStackResearch && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Choose your integrations</CardTitle>
              <CardDescription>
                We found a few options for some integrations. Pick what works best for your project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(project.techStackResearch as { choices: Array<{ need: string; options: Array<{ library: string; package: string; reason: string }> }> }).choices?.map((choice) => (
                <div key={choice.need} className="space-y-3">
                  <h4 className="text-sm font-medium">{choice.need}</h4>
                  <RadioGroup
                    value={techChoices[choice.need] || ""}
                    onValueChange={(value) => setTechChoices((prev) => ({ ...prev, [choice.need]: value }))}
                  >
                    {choice.options.map((option) => (
                      <div key={option.library} className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                        <RadioGroupItem value={option.library} id={`${choice.need}-${option.library}`} className="mt-0.5" />
                        <Label htmlFor={`${choice.need}-${option.library}`} className="cursor-pointer flex-1">
                          <span className="font-medium text-sm">{option.library}</span>
                          <span className="text-xs text-muted-foreground ml-2">{option.package}</span>
                          <p className="text-xs text-muted-foreground mt-1">{option.reason}</p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <Button
                onClick={handleSubmitTechChoices}
                disabled={
                  (project.techStackResearch as { choices: Array<{ need: string }> }).choices?.some(
                    (c) => !techChoices[c.need]
                  )
                }
                className="w-full"
              >
                Continue with these choices
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scaffolding failed */}
        {isScaffoldingFailed && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive flex-1 text-sm">
                {project.scaffoldingError || "Scaffolding failed. Please try again."}
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                scaffoldingAttempted.current = false;
                setError(null);
              }} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success: repo created */}
        {project.status === PROJECT_STATUS.COMPLETE && project.githubRepoUrl && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">Project scaffolded</h3>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Your project is ready on GitHub with AI-optimized scaffolding.
                </p>

                {matchedTemplate && (
                  <div className="w-full max-w-md space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{matchedTemplate.name}</p>
                        {project.matchScore !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {project.matchScore}% match
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {matchedTemplate.stack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button asChild size="lg" className="gap-2">
                  <a
                    href={project.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Default project view for other statuses */}
        {!isInProgress && project.status !== PROJECT_STATUS.COMPLETE && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <CardDescription>
                    Created{" "}
                    {new Date(project._creationTime).toLocaleDateString()}
                  </CardDescription>
                </div>
                <span className="px-3 py-1 text-sm rounded-full bg-secondary">
                  {statusLabels[project.status] || project.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {project.status === PROJECT_STATUS.INTERVIEW && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Next Steps
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Continue the interview to describe your app requirements.
                  </p>
                  <Button onClick={() => router.push(`/interview/${projectId}`)}>
                    Continue Interview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

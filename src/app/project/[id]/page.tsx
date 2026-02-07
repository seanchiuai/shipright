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
import { ElapsedTimer } from "@/components/elapsed-timer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PROJECT_STATUS } from "@/lib/constants";

function sanitizeErrorMessage(raw: string): string {
  if (!raw) return "Something went wrong. Please try again.";
  const lower = raw.toLowerCase();
  if (lower.includes("debug:") || lower.includes("nohup") || lower.includes("launcher script"))
    return "The build process encountered an issue. Please try again.";
  if (lower.includes("oauth") || lower.includes("credentials") || lower.includes("authentication") || lower.includes("401") || lower.includes("bad credentials") || lower.includes("reconnect"))
    return "Your GitHub connection expired. Please reconnect your GitHub account.";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "The operation timed out. Please try again.";
  if (lower.includes("rate limit") || lower.includes("429"))
    return "Rate limited by GitHub. Please wait a moment and retry.";
  if (lower.includes("sandbox") || lower.includes("daytona"))
    return "The build environment encountered an issue. Please retry.";
  if (raw.length > 200 || raw.includes("stack") || raw.includes("at "))
    return "An unexpected error occurred. Please try again.";
  return raw;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const projectId = params.id as Id<"projects">;

  const convexUser = useSyncUser();
  const project = useQuery(api.projects.get, { projectId });
  const matchedTemplate = useQuery(
    api.templates.get,
    project?.templateId ? { templateId: project.templateId as Id<"templates"> } : "skip"
  );

  const matchTemplate = useAction(api.matching.matchTemplate);
  const cloneTemplate = useAction(api.github.cloneTemplate);
  const runScaffolding = useAction(api.scaffolding.runScaffoldingPipeline);
  const resumeAfterChoices = useAction(api.scaffolding.resumeAfterChoices);
  const submitTechChoicesAction = useAction(api.scaffolding.submitTechChoices);
  const resetInterview = useMutation(api.projects.resetInterview);
  const retryRepo = useMutation(api.projects.retryRepoCreation);
  const setRepoFailed = useMutation(api.projects.setRepoFailed);
  const restartRepo = useMutation(api.projects.restartRepoCreation);
  const recreateRepo = useMutation(api.projects.recreateRepo);

  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloneInFlight = useRef(false);
  const scaffoldingAttempted = useRef(false);
  const [techChoices, setTechChoices] = useState<Record<string, string>>({});

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
      // Don't reset cloneInFlight when status changes — the status transition
      // from "matched" → "building" is caused by OUR mutation, and resetting
      // the guard here caused a race condition (second action dispatched).
      if (project?.status !== "matched") return;
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
        const message = e instanceof Error ? e.message : "Repository creation failed";
        if (message.includes("401") || message.includes("Bad credentials") || message.includes("reconnect your GitHub")) {
          router.push(`/connect-github?returnTo=/project/${projectId}`);
        } else if (!message.includes("Cannot create repo")) {
          // Show error to user (but not "Cannot create repo" which means another attempt is running)
          setError(message);
        }
        cloneInFlight.current = false;
      }
    }
    runClone();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cloneTemplate is unstable (new ref each render); cloneInFlight guards re-entry
  }, [project?.status, project?.name, matchedTemplate, convexUser, projectId, router]);

  const isTimerActive = project?.status === "matched" ||
    (project?.status === "building" && !project?.scaffoldingStatus);

  // Auto-trigger scaffolding when repo files are committed (repoReady=true)
  useEffect(() => {
    async function startScaffolding() {
      if (project?.status !== "building") return;
      if (scaffoldingAttempted.current) return;
      if (!project.repoReady) return;

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
  }, [project?.status, project?.repoReady, projectId, runScaffolding]);

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

  async function handleRecreateRepo() {
    try {
      cloneInFlight.current = false;
      scaffoldingAttempted.current = false;
      setError(null);
      await recreateRepo({ projectId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to recreate repo");
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
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="dark">
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
      <div className="min-h-screen bg-background" data-theme="dark">
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
    <div className="min-h-screen bg-background" data-theme="dark">
      <AppNavbar title={project.name} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/dashboard")}
        >
          &larr; Back to Dashboard
        </Button>

        {/* Transient error display (hidden when persistent error is shown) */}
        {error && project.status !== PROJECT_STATUS.REPO_FAILED && !isScaffoldingFailed && (
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
                  {sanitizeErrorMessage(project.repoError || "Repository creation failed.")}
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
                  {(project.status === PROJECT_STATUS.MATCHED || project.status === PROJECT_STATUS.BUILDING) && "Creating your repository..."}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {project.status === PROJECT_STATUS.MATCHING &&
                    "Analyzing your requirements to find the perfect starting point."}
                  {(project.status === PROJECT_STATUS.MATCHED || project.status === PROJECT_STATUS.BUILDING) &&
                    "Cloning the template and creating your GitHub repository."}
                </p>
                <ElapsedTimer
                  isActive={isTimerActive}
                  renderContent={(elapsedSeconds) => (
                    <>
                      {elapsedSeconds > 60 && elapsedSeconds <= 120 && (
                        <p className="text-xs text-amber-400 mt-1">
                          Taking longer than expected ({elapsedSeconds}s)...
                        </p>
                      )}
                      {elapsedSeconds > 120 && (
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <p className="text-xs text-amber-400">
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
                    </>
                  )}
                />

                {/* Template info once matched */}
                {(project.status === PROJECT_STATUS.MATCHED || project.status === PROJECT_STATUS.BUILDING) &&
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
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          isDone ? "text-green-400" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
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
                      <div key={option.library} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
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
        {isScaffoldingFailed && (() => {
          const errMsg = project.scaffoldingError || "";
          const isRepoDeleted = errMsg.includes("was deleted");
          const isRepoRenamed = errMsg.includes("renamed or moved");
          const isPermDenied = errMsg.includes("no longer have write access");
          const isTokenExpired = errMsg.includes("connection has expired");
          const isRepoError = isRepoDeleted || isRepoRenamed || isPermDenied || isTokenExpired;

          return (
            <Card className="mb-6 border-destructive">
              <CardContent className="pt-6 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-destructive flex-1 text-sm">
                  {sanitizeErrorMessage(errMsg || "Scaffolding failed. Please try again.")}
                </p>
                <div className="flex gap-2">
                  {(isRepoDeleted || isRepoRenamed) && (
                    <Button variant="outline" size="sm" onClick={handleRecreateRepo} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Recreate Repo
                    </Button>
                  )}
                  {isTokenExpired && (
                    <Button variant="outline" size="sm" onClick={() => router.push(`/connect-github?returnTo=/project/${projectId}`)} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Reconnect GitHub
                    </Button>
                  )}
                  {isPermDenied && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        GitHub Settings
                      </a>
                    </Button>
                  )}
                  {!isRepoError && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      setError(null);
                      scaffoldingAttempted.current = true;
                      try {
                        await runScaffolding({ projectId });
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Retry failed");
                        scaffoldingAttempted.current = false;
                      }
                    }} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Success: repo created */}
        {project.status === PROJECT_STATUS.COMPLETE && project.githubRepoUrl && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
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

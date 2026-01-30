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
} from "lucide-react";
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
  const resetInterview = useMutation(api.projects.resetInterview);

  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloneAttempted = useRef(false);

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
      if (project?.status !== "matched") return;
      if (cloneAttempted.current) return;
      if (!matchedTemplate || !convexUser) return;

      if (!convexUser.githubToken) {
        router.push(`/connect-github?returnTo=/project/${projectId}`);
        return;
      }

      cloneAttempted.current = true;
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
        const message = e instanceof Error ? e.message : "Failed to create repository";
        if (message.includes("TEMPLATE_UNAVAILABLE")) {
          setError("Template unavailable. Please start over with a different idea.");
        } else if (message.includes("GitHub connection expired") || message.includes("401")) {
          setError("GitHub connection expired. Reconnecting...");
          router.push(`/connect-github?returnTo=/project/${projectId}`);
        } else if (message.includes("Not Found") || message.includes("HttpError")) {
          setError("Repository creation failed. Please try again or start over.");
        } else {
          setError("Failed to create repository. Please try again or start over.");
        }
        cloneAttempted.current = false;
      }
    }
    runClone();
  }, [project?.status, project?.name, matchedTemplate, convexUser, projectId, cloneTemplate, router]);

  function handleRetry() {
    cloneAttempted.current = false;
    setError(null);
  }

  async function handleStartOver() {
    try {
      cloneAttempted.current = false;
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
    [PROJECT_STATUS.BUILDING]: "Building",
    [PROJECT_STATUS.COMPLETE]: "Complete",
  };

  const isInProgress = !error && ([PROJECT_STATUS.MATCHING, PROJECT_STATUS.MATCHED] as string[]).includes(project.status);

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

        {/* Error display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive flex-1">{error}</p>
              <div className="flex gap-2">
                {!error.includes("unavailable") && (
                  <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleStartOver} className="gap-2">
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress view for matching/matched/building */}
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

        {/* Success: repo created */}
        {project.status === PROJECT_STATUS.COMPLETE && project.githubRepoUrl && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">Repository created</h3>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Your project is ready on GitHub.
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

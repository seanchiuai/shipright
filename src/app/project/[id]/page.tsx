"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import {
  Check,
  X,
  Loader2,
  Github,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Package,
  AlertCircle,
} from "lucide-react";

type Template = {
  _id: string;
  name: string;
  description: string;
  sourceUrl: string;
  stack: string[];
  capabilities: {
    auth: {
      present: boolean;
      providers: string[];
      hasRoles: boolean;
      hasOrgs: boolean;
    };
    database: {
      present: boolean;
      type: string;
      realtime: boolean;
    };
    payments: {
      present: boolean;
      provider?: string;
      models?: string[];
    };
    ui: {
      framework: string;
      hasAdminDashboard: boolean;
      hasLandingPage: boolean;
    };
    features: {
      fileUploads: boolean;
      email: boolean;
      search: boolean;
      ai: boolean;
    };
  };
};

type Weights = {
  auth: number;
  database: number;
  payments: number;
  features: number;
  ui: number;
};

type MatchResult = {
  template: Template;
  score: number;
  scoreBreakdown: {
    auth: number;
    database: number;
    payments: number;
    features: number;
    ui: number;
  };
  weights: Weights;
  gaps: string[];
  included: string[];
};

function FeatureCheckItem({
  label,
  included,
}: {
  label: string;
  included: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      {included ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={included ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  let variant: "default" | "secondary" | "destructive" = "default";
  let label = "Great Match";

  if (score >= 70) {
    variant = "default";
    label = "Great Match";
  } else if (score >= 50) {
    variant = "secondary";
    label = "Good Match";
  } else {
    variant = "destructive";
    label = "Fallback";
  }

  return (
    <Badge variant={variant} className="text-sm">
      {score}% - {label}
    </Badge>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const projectId = params.id as Id<"projects">;

  const convexUser = useSyncUser();
  const project = useQuery(api.projects.get, { projectId });
  const templates = useQuery(api.templates.list, {});

  const matchTemplate = useAction(api.matching.matchTemplate);
  const resetInterview = useMutation(api.projects.resetInterview);

  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchedTemplate =
    project?.templateId && templates
      ? templates.find((t) => t._id === project.templateId)
      : null;

  useEffect(() => {
    async function runMatching() {
      if (project?.status === "matching" && !matchResult && !matching) {
        setMatching(true);
        setError(null);
        try {
          const result = await matchTemplate({ projectId });
          setMatchResult(result);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to match template");
        } finally {
          setMatching(false);
        }
      }
    }
    runMatching();
  }, [project?.status, matchResult, matching, matchTemplate, projectId]);

  useEffect(() => {
    if (matchedTemplate && project?.matchScore !== undefined && !matchResult) {
      setMatchResult({
        template: matchedTemplate as Template,
        score: project.matchScore,
        scoreBreakdown: { auth: 0, database: 0, payments: 0, features: 0, ui: 0 },
        weights: { auth: 0, database: 0, payments: 0, features: 0, ui: 0 },
        gaps: project.matchGaps || [],
        included: getIncludedFeatures(matchedTemplate as Template),
      });
    }
  }, [matchedTemplate, project?.matchScore, project?.matchGaps, matchResult]);

  function getIncludedFeatures(template: Template): string[] {
    const included: string[] = [];
    const caps = template.capabilities;

    if (caps.auth.present) {
      included.push(`Authentication (${caps.auth.providers.join(", ")})`);
      if (caps.auth.hasRoles) included.push("Role-based access");
      if (caps.auth.hasOrgs) included.push("Organizations/teams");
    }

    if (caps.database.present) {
      included.push(`Database (${caps.database.type})`);
      if (caps.database.realtime) included.push("Real-time sync");
    }

    if (caps.payments.present) {
      const models = caps.payments.models?.join(", ") || "";
      included.push(`Payments via ${caps.payments.provider} (${models})`);
    }

    if (caps.ui.hasAdminDashboard) included.push("Admin dashboard");
    if (caps.ui.hasLandingPage) included.push("Landing page");

    if (caps.features.fileUploads) included.push("File uploads");
    if (caps.features.email) included.push("Email notifications");
    if (caps.features.search) included.push("Search");
    if (caps.features.ai) included.push("AI integration");

    return included;
  }

  async function handleStartOver() {
    try {
      await resetInterview({ projectId });
      setMatchResult(null);
      router.push(`/interview/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset");
    }
  }

  async function handleCreateRepository() {
    // Phase 4: GitHub integration will be implemented here
    alert("GitHub repository creation coming in Phase 4!");
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
        <header className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Shipright
            </Button>
          </div>
        </header>
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
    interview: "In Interview",
    matching: "Finding Template",
    building: "Building",
    complete: "Complete",
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Matching in progress */}
        {project.status === "matching" && matching && !matchResult && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">Finding the best template...</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  We&apos;re analyzing your requirements to find the perfect starting point.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template match result - US-007 */}
        {project.status === "matching" && matchResult && (
          <div className="space-y-6">
            {/* Template Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {matchResult.template.name}
                      </CardTitle>
                      <CardDescription>
                        {matchResult.template.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ConfidenceBadge score={matchResult.score} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tech Stack */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Tech Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.template.stack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* AI-Determined Matching Priorities */}
                {matchResult.weights.auth > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Matching Priorities
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      AI analyzed your app to determine what matters most:
                    </p>
                    <div className="space-y-2">
                      {Object.entries(matchResult.weights)
                        .sort(([, a], [, b]) => b - a)
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs w-20 capitalize">{key}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10">
                              {Math.round(value * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* What's Included */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    What&apos;s Included
                  </h4>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {matchResult.included.map((feature) => (
                      <FeatureCheckItem
                        key={feature}
                        label={feature}
                        included={true}
                      />
                    ))}
                  </div>
                </div>

                {/* What Will Be Built */}
                {matchResult.gaps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      What Will Be Built
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      These features aren&apos;t in the template and will be added:
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {matchResult.gaps.map((gap) => (
                        <div key={gap} className="flex items-center gap-2 py-1">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Link */}
                <div className="pt-4 border-t">
                  <a
                    href={matchResult.template.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    View template source
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Different Template
              </Button>
              <Button onClick={handleCreateRepository} className="gap-2">
                Create My Repository
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Default project view for other statuses */}
        {project.status !== "matching" && (
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
              {project.githubRepoUrl && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    GitHub Repository
                  </h3>
                  <Button variant="outline" asChild>
                    <a
                      href={project.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
                    </a>
                  </Button>
                </div>
              )}

              {project.status === "interview" && (
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

              {project.status === "complete" && !project.githubRepoUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Project complete but no repository was created.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

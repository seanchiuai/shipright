"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthActions } from "@convex-dev/auth/react";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const projectId = params.id as Id<"projects">;

  const user = useQuery(api.users.current);
  const project = useQuery(api.projects.get, { projectId });

  if (user === undefined || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image} alt={user.name || ""} />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void signOut()}
                className="cursor-pointer"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <Button>Continue Interview</Button>
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
      </main>
    </div>
  );
}

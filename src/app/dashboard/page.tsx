"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSyncUser } from "@/hooks/useSyncUser";
import { ArrowRight, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [appIdea, setAppIdea] = useState("");
  const [creating, setCreating] = useState(false);

  const convexUser = useSyncUser();
  const projects = useQuery(
    api.projects.list,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);
  const generateQuestions = useAction(api.ai.generateInterviewQuestions);

  async function handleSubmit() {
    if (!convexUser || !appIdea.trim()) return;
    setCreating(true);
    try {
      // Create project with a name derived from the idea
      const projectId = await createProject({
        userId: convexUser._id,
        name: appIdea.trim().slice(0, 50) + (appIdea.length > 50 ? "..." : ""),
      });

      // Save the app idea and move to step 2
      await updateAppIdea({ projectId, appIdea: appIdea.trim() });

      // Generate questions in the background, then redirect
      await generateQuestions({
        projectId,
        appIdea: appIdea.trim(),
        round: 1,
      });

      router.push(`/interview/${projectId}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      setCreating(false);
    }
  }

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Shipright</h1>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* App Idea Input */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-2">What do you want to build?</h2>
          <p className="text-muted-foreground mb-6">
            Describe your app idea and we&apos;ll help you turn it into a GitHub repo.
          </p>

          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all focus-within:border-primary focus-within:shadow-[0_4px_20px_rgba(99,102,241,0.15)]">
            <Sparkles className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
            <textarea
              value={appIdea}
              onChange={(e) => setAppIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && appIdea.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="I want to build an app where people can..."
              maxLength={500}
              disabled={creating}
              className="flex-1 border-none outline-none text-base resize-none bg-transparent min-h-[60px] leading-relaxed placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={creating || !appIdea.trim()}
              className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:bg-primary/90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {appIdea.length}/500
          </p>
        </div>

        {/* Projects List */}
        {projects === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No projects yet. Type your idea above to get started!</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-medium mb-4 text-muted-foreground">Your Projects</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/project/${project._id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription>
                      {new Date(project._creationTime).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    {project.githubRepoUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={project.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on GitHub
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {project.status === "interview" ? "In progress" : project.status}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

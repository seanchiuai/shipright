"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { useSyncUser } from "@/hooks/useSyncUser";
import * as Sentry from "@sentry/nextjs";
import { ArrowUp } from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";
import {
  DashboardBackground,
  StaggerContainer,
  ProjectCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/dashboard";

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [appIdea, setAppIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: Id<"projects">; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"projects">; name: string } | null>(null);

  const convexUser = useSyncUser();
  const projects = useQuery(
    api.projects.list,
    convexUser ? {} : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);
  const renameProject = useMutation(api.projects.rename);
  const removeProject = useMutation(api.projects.remove);

  async function submitIdea(idea: string) {
    if (!convexUser || !idea.trim()) return;
    setCreating(true);
    try {
      const projectId = await createProject({
        name: idea.trim().slice(0, 50) + (idea.length > 50 ? "..." : ""),
      });

      await updateAppIdea({ projectId, appIdea: idea.trim() });

      // Navigate immediately — interview page handles AI generation
      router.push(`/interview/${projectId}`);
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "project_creation" }, extra: { step: "dashboard" } });
      setCreating(false);
    }
  }

  // Check for pending app idea from landing page
  useEffect(() => {
    const pendingIdea = localStorage.getItem("pendingAppIdea");
    if (pendingIdea && convexUser) {
      setAppIdea(pendingIdea);
      localStorage.removeItem("pendingAppIdea");
      // Auto-submit the pending idea after a short delay
      setTimeout(() => {
        submitIdea(pendingIdea);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexUser]);

  function handleSubmit() {
    submitIdea(appIdea);
  }

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-theme="dark">
        <DashboardBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-theme="dark">
        <DashboardBackground />
        <p className="text-muted-foreground">Please sign in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-theme="dark">
      <DashboardBackground />

      <AppNavbar />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight mb-4 tracking-tight">
            What do you want to{" "}
            <em className="text-primary not-italic">build</em>?
          </h1>
        </motion.div>

        {/* Input section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl opacity-100 blur-lg transition-opacity duration-300 pointer-events-none" />

            <div className="relative bg-card/90 backdrop-blur-sm border border-primary/30 rounded-2xl p-5 flex items-end gap-4 shadow-[0_4px_30px_rgba(59,130,246,0.1)] transition-all group-focus-within:border-primary group-focus-within:shadow-[0_4px_30px_rgba(59,130,246,0.15)]">
              <textarea
                ref={inputRef}
                value={appIdea}
                onChange={(e) => setAppIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && appIdea.trim()) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="I want to build an app where people can..."
                maxLength={5000}
                disabled={creating}
                className="flex-1 border-none outline-none text-sm sm:text-base resize-none bg-transparent min-h-[80px] leading-relaxed placeholder:text-muted-foreground disabled:opacity-50"
              />

              <button
                onClick={handleSubmit}
                disabled={creating || !appIdea.trim()}
                className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                  appIdea.trim() && !creating
                    ? "bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>

          </div>
        </motion.div>

        {/* Projects section */}
        <div>
          {projects === undefined ? (
            <LoadingSkeleton />
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center justify-between mb-8"
              >
                <div>
                  <h2 className="font-serif text-2xl font-medium text-foreground mb-1">
                    Your Projects
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {projects.length} project{projects.length !== 1 ? "s" : ""}{" "}
                    in progress
                  </p>
                </div>
              </motion.div>

              <StaggerContainer
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                delay={0.4}
              >
                {projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onClick={() => router.push(`/project/${project._id}`)}
                    onRename={() => {
                      setRenameTarget({ id: project._id, name: project.name });
                      setRenameValue(project.name);
                    }}
                    onDelete={() => {
                      setDeleteTarget({ id: project._id, name: project.name });
                    }}
                  />
                ))}
              </StaggerContainer>
            </>
          )}
        </div>
      </main>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim() && renameTarget) {
                renameProject({ projectId: renameTarget.id, name: renameValue.trim() });
                setRenameTarget(null);
              }
            }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renameTarget && renameValue.trim()) {
                  renameProject({ projectId: renameTarget.id, name: renameValue.trim() });
                  setRenameTarget(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo; and all its interview data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  removeProject({ projectId: deleteTarget.id });
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

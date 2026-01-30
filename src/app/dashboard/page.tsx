"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { useSyncUser } from "@/hooks/useSyncUser";
import {
  ArrowRight,
  ArrowUp,
  Folder,
  Github,
  Clock,
  Zap,
  ChevronRight,
  Plus,
  Package,
} from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";

// Animated gradient background component
function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }> = [];
    let animationId: number;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      if (!canvas) return null;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.2 + 0.05,
        hue: Math.random() * 20 + 30,
      };
    }

    function initParticles() {
      if (!canvas) return;
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle();
        if (particle) particles.push(particle);
      }
    }

    function drawParticles() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`;
        ctx.fill();

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(35, 90%, 55%, ${0.06 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(drawParticles);
    }

    resizeCanvas();
    initParticles();
    drawParticles();

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Gradient background */}
      <div
        className="fixed inset-0 -z-30"
        style={{
          background:
            "linear-gradient(135deg, #faf9f7 0%, #f0ebe3 50%, #e8e0d5 100%)",
        }}
      />

      {/* Animated grid */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(240, 140, 58, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(240, 140, 58, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "gridMove 20s linear infinite",
        }}
      />

      {/* Gradient orbs */}
      <div
        className="fixed -z-10 rounded-full opacity-40"
        style={{
          top: "-10%",
          right: "10%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(240, 140, 58, 0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "float1 8s ease-in-out infinite",
        }}
      />
      <div
        className="fixed -z-10 rounded-full opacity-40"
        style={{
          bottom: "20%",
          left: "-5%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "float2 10s ease-in-out infinite",
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
      />
    </>
  );
}

// Stagger animation wrapper
function StaggerContainer({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  },
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; glow: string }
  > = {
    interview: {
      label: "In Progress",
      color: "text-amber-600",
      bg: "bg-amber-50",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    },
    matching: {
      label: "Matching",
      color: "text-purple-600",
      bg: "bg-purple-50",
      glow: "shadow-[0_0_12px_rgba(139,92,246,0.2)]",
    },
    matched: {
      label: "Creating Repo",
      color: "text-blue-600",
      bg: "bg-blue-50",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]",
    },
    building: {
      label: "Building",
      color: "text-amber-600",
      bg: "bg-amber-50",
      glow: "shadow-[0_0_12px_rgba(240,140,58,0.2)]",
    },
    complete: {
      label: "Complete",
      color: "text-green-600",
      bg: "bg-green-50",
      glow: "shadow-[0_0_12px_rgba(34,197,94,0.2)]",
    },
  };

  const config = statusConfig[status] || statusConfig.interview;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg} ${config.glow}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-current"
        style={{ animation: "pulse 2s infinite" }}
      />
      {config.label}
    </span>
  );
}

// Project card component
function ProjectCard({
  project,
  onClick,
}: {
  project: {
    _id: string;
    name: string;
    status: string;
    githubRepoUrl?: string;
    templateName?: string;
    _creationTime: number;
  };
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={staggerItem}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />

      <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_8px_30px_rgba(240,140,58,0.12)] group-hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-purple-500/20 transition-colors">
            <Folder className="w-6 h-6 text-primary" />
          </div>
          <StatusBadge status={project.status} />
        </div>

        <h3 className="font-serif text-lg font-medium text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {project.name}
        </h3>

        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${project.templateName ? "mb-1" : "mb-4"}`}>
          <Clock className="w-4 h-4" />
          <span>{new Date(project._creationTime).toLocaleDateString()}</span>
        </div>

        {project.templateName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Package className="w-4 h-4" />
            <span className="truncate">{project.templateName}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {project.githubRepoUrl ? (
            <a
              href={project.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              View Repo
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">
              Continue building
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
        <Zap className="w-10 h-10 text-primary" />
      </div>
      <h3 className="font-serif text-2xl font-medium text-foreground mb-3">
        Ready to build something?
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Type your app idea above and we&apos;ll help you turn it into a GitHub
        repo in minutes.
      </p>
    </motion.div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card/50 border border-border rounded-2xl p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted" />
            <div className="w-20 h-6 rounded-full bg-muted" />
          </div>
          <div className="h-6 w-3/4 rounded bg-muted mb-2" />
          <div className="h-4 w-1/2 rounded bg-muted mb-4" />
          <div className="pt-4 border-t border-border/50">
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [appIdea, setAppIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const convexUser = useSyncUser();
  const projects = useQuery(
    api.projects.list,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);

  async function submitIdea(idea: string) {
    if (!convexUser || !idea.trim()) return;
    setCreating(true);
    try {
      const projectId = await createProject({
        userId: convexUser._id,
        name: idea.trim().slice(0, 50) + (idea.length > 50 ? "..." : ""),
      });

      await updateAppIdea({ projectId, appIdea: idea.trim() });

      // Navigate immediately — interview page handles AI generation
      router.push(`/interview/${projectId}`);
    } catch (error) {
      console.error("Failed to create project:", error);
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
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
        <DashboardBackground />
        <p className="text-muted-foreground">Please sign in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
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
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Describe your app idea and we&apos;ll help you turn it into a GitHub
            repo.
          </p>
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
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl opacity-100 blur-lg transition-opacity duration-300" />

            <div className="relative bg-card/90 backdrop-blur-sm border border-primary/30 rounded-2xl p-5 flex items-end gap-4 shadow-[0_4px_30px_rgba(240,140,58,0.12)] transition-all group-focus-within:border-primary group-focus-within:shadow-[0_4px_30px_rgba(240,140,58,0.15)]">
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
                className="w-9 h-9 bg-primary/20 text-primary rounded-lg flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:bg-primary/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="mt-3 px-2">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to submit
              </p>
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
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
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
                  />
                ))}
              </StaggerContainer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

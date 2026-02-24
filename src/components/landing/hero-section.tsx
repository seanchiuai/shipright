"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import * as Sentry from "@sentry/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";

const placeholders = [
  "A marketplace like Airbnb",
  "A social network for professionals",
  "E-commerce store for unique products",
  "A task management tool",
  "Fitness tracking mobile app",
];

export function HeroSection() {
  const [appIdea, setAppIdea] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isSignedIn } = useUser();
  const router = useRouter();
  const convexUser = useSyncUser();

  const createProject = useMutation(api.projects.create);
  const updateAppIdea = useMutation(api.projects.updateAppIdea);

  useEffect(() => {
    let placeholderIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let lastUpdate = 0;
    let nextDelay = 100;
    let rafId: number;
    let cancelled = false;

    function typeEffect(timestamp: number) {
      if (cancelled) return;

      if (timestamp - lastUpdate < nextDelay) {
        rafId = requestAnimationFrame(typeEffect);
        return;
      }

      lastUpdate = timestamp;
      const currentPlaceholder = placeholders[placeholderIndex];

      if (isDeleting) {
        charIndex--;
        setPlaceholder(currentPlaceholder.substring(0, charIndex));
        nextDelay = 50;
      } else {
        charIndex++;
        setPlaceholder(currentPlaceholder.substring(0, charIndex));
        nextDelay = 100;
      }

      if (!isDeleting && charIndex === currentPlaceholder.length) {
        nextDelay = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        placeholderIndex = (placeholderIndex + 1) % placeholders.length;
        nextDelay = 500;
      }

      rafId = requestAnimationFrame(typeEffect);
    }

    rafId = requestAnimationFrame(typeEffect);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleSubmit = async () => {
    if (!appIdea.trim()) return;

    if (!isSignedIn) {
      localStorage.setItem("pendingAppIdea", appIdea.trim());
      router.push("/dashboard");
      return;
    }

    if (!convexUser) {
      localStorage.setItem("pendingAppIdea", appIdea.trim());
      router.push("/dashboard");
      return;
    }

    setIsSubmitting(true);
    try {
      const projectId = await createProject({
        name: appIdea.trim().slice(0, 50) + (appIdea.length > 50 ? "..." : ""),
      });

      await updateAppIdea({ projectId, appIdea: appIdea.trim() });

      router.push(`/interview/${projectId}`);
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "project_creation" }, extra: { step: "hero_section" } });
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center relative overflow-hidden pt-20 pb-12">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central beacon glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, transparent 70%)" }}
        />
        {/* Secondary ambient */}
        <div
          className="absolute bottom-0 left-1/4 w-[400px] h-[400px]"
          style={{ background: "radial-gradient(circle at center, rgba(99,102,241,0.04) 0%, transparent 70%)" }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center w-full relative z-10">
        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.08] tracking-tight mb-4 text-foreground">
          The foundation vibe
          <br />
          coding <em className="italic text-primary">needs</em>
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
          A production-ready codebase with built-in AI context.
        </p>

        {/* Input */}
        <div className="max-w-xl mx-auto">
          <div className="relative group">
            {/* Glow ring */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-60 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)" }}
            />
            <div className="relative bg-foreground/[0.04] border border-border rounded-xl p-1 shadow-[0_4px_30px_rgba(59,130,246,0.08)] transition-all focus-within:border-primary/30 focus-within:shadow-[0_4px_40px_rgba(59,130,246,0.15)]">
              <textarea
                ref={textareaRef}
                value={appIdea}
                onChange={(e) => setAppIdea(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 pt-4 pb-2 text-base resize-none bg-transparent border-none outline-none text-foreground placeholder:text-foreground/25 disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <span className="text-xs text-foreground/20">
                  {appIdea.trim() ? "Cmd + Enter to submit" : ""}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!appIdea.trim() || isSubmitting}
                  className={`h-12 px-6 text-base font-medium rounded-lg flex items-center gap-2 transition-all ${
                    appIdea.trim() && !isSubmitting
                      ? "bg-primary text-primary-foreground hover:bg-primary/80 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      : "bg-foreground/[0.04] text-foreground/20 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Start building
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-foreground/20 mt-4">
            You own every line of code.
          </p>
        </div>
      </div>
    </section>
  );
}

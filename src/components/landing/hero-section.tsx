"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
  const generateQuestions = useAction(api.ai.generateInterviewQuestions);

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

      await generateQuestions({
        projectId,
        appIdea: appIdea.trim(),
        round: 1,
      });

      router.push(`/interview/${projectId}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="pt-24 pb-20 md:pt-36 md:pb-28">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {/* Tagline */}
        <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
          The on-ramp to vibe coding
        </p>

        {/* Headline */}
        <h1 className="font-serif text-[2.75rem] sm:text-6xl md:text-7xl leading-[1.08] tracking-tight mb-6">
          From app idea to
          <br />
          <em className="italic">architecture</em>
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-12 leading-relaxed">
          Describe what you want to build. Get a GitHub repo with plans,
          structure, and scaffolding ready to vibe code.
        </p>

        {/* Input */}
        <div className="max-w-xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl opacity-100 blur-lg" />
          <div className="relative bg-white border border-primary/30 rounded-xl p-1 shadow-[0_4px_30px_rgba(240,140,58,0.12)] transition-all focus-within:border-foreground/30 focus-within:shadow-[0_4px_30px_rgba(240,140,58,0.18)]">
            <textarea
              ref={textareaRef}
              value={appIdea}
              onChange={(e) => setAppIdea(e.target.value)}
              placeholder={placeholder}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-4 pt-4 pb-2 text-base resize-none bg-transparent border-none outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <span className="text-xs text-muted-foreground/60">
                {appIdea.trim() ? "Cmd + Enter to submit" : ""}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!appIdea.trim() || isSubmitting}
                className={`h-9 px-5 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
                  appIdea.trim() && !isSubmitting
                    ? "bg-stone-500 text-white hover:bg-stone-400 shadow-sm"
                    : "bg-stone-100 text-stone-300 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    Start building
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-4">
            No credit card required. You own every line of code.
          </p>
        </div>
      </div>
    </section>
  );
}

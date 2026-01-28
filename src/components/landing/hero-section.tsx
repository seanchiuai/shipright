"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSyncUser } from "@/hooks/useSyncUser";

const placeholders = [
  "Vertical AI B2B SaaS for enterprise workflows",
  "Uber for laundry but make it agentic",
  "Disrupting the $4.2T spreadsheet industry",
  "AI-powered AI for your AI",
  "WeWork meets Theranos meets integrity",
  "LinkedIn but people are honest",
  "Airbnb for your garage (seriously)",
  "A pivot-ready MVP with synergy",
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

  // Typing effect
  useEffect(() => {
    let placeholderIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    function typeEffect() {
      const currentPlaceholder = placeholders[placeholderIndex];
      let typeSpeed = 100;

      if (isDeleting) {
        setPlaceholder(currentPlaceholder.substring(0, charIndex - 1));
        charIndex--;
        typeSpeed = 50;
      } else {
        setPlaceholder(currentPlaceholder.substring(0, charIndex + 1));
        charIndex++;
        typeSpeed = 100;
      }

      if (!isDeleting && charIndex === currentPlaceholder.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        placeholderIndex = (placeholderIndex + 1) % placeholders.length;
        typeSpeed = 500;
      }

      timeoutId = setTimeout(typeEffect, typeSpeed);
    }

    typeEffect();

    return () => clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async () => {
    if (!appIdea.trim()) return;

    if (!isSignedIn) {
      // Store idea in localStorage and redirect to sign in
      localStorage.setItem("pendingAppIdea", appIdea.trim());
      router.push("/dashboard");
      return;
    }

    // User is signed in, create project directly
    if (!convexUser) {
      // User not synced yet, store idea and redirect
      localStorage.setItem("pendingAppIdea", appIdea.trim());
      router.push("/dashboard");
      return;
    }

    setIsSubmitting(true);
    try {
      const projectId = await createProject({
        userId: convexUser._id,
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
    <section className="py-20 md:py-24 text-center relative">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Headline */}
        <motion.h1
          className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal leading-tight mb-6 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The missing piece for
          <br />
          <em className="text-primary">vibe coding</em>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Turn ideas into{" "}
          <strong className="text-foreground font-semibold">
            plans and architecture
          </strong>{" "}
          ready to vibe code.
        </motion.p>

        {/* Input box */}
        <motion.div
          className="max-w-[720px] mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm transition-all focus-within:border-primary focus-within:shadow-[0_4px_30px_rgba(0,102,255,0.15),0_0_0_1px_#0066ff]">
            <svg
              className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <textarea
              ref={textareaRef}
              value={appIdea}
              onChange={(e) => setAppIdea(e.target.value)}
              placeholder={placeholder}
              disabled={isSubmitting}
              className="flex-1 border-none outline-none text-lg resize-none bg-transparent min-h-[80px] leading-relaxed placeholder:text-muted-foreground disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!appIdea.trim() || isSubmitting}
              className="w-[52px] h-[52px] bg-primary text-white border-none rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:bg-[#0052cc] hover:scale-110 hover:shadow-[0_6px_20px_rgba(0,102,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-border max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-xs border-2 border-background">
              S
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-xs border-2 border-background">
              M
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-semibold text-xs border-2 border-background">
              J
            </div>
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-xs border-2 border-background">
              +
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Join <strong className="text-foreground">50+</strong> founders building with ShipRight
          </p>
        </motion.div>
      </div>
    </section>
  );
}

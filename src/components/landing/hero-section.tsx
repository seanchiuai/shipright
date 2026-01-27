"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

const headlineWords = ["What", "will", "you", "build", "today?"];

export function HeroSection() {
  const [appIdea, setAppIdea] = useState("");
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignedIn) {
      router.push(`/dashboard?idea=${encodeURIComponent(appIdea)}`);
    }
  };

  return (
    <section className="min-h-[85vh] flex items-center justify-center pt-16">
      <div className="text-center max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline with word animation */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 tracking-tight">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              className={`inline-block mr-3 sm:mr-4 ${
                word === "build" ? "text-gradient" : ""
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: "easeOut",
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subheadline */}
        <motion.p
          className="text-xl sm:text-2xl text-muted-foreground mb-10 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          Describe your app. Get a production-ready GitHub repo in minutes.
        </motion.p>

        {/* Conversational input */}
        <motion.form
          onSubmit={handleSubmit}
          className="relative max-w-xl mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="I want to build a SaaS that..."
              value={appIdea}
              onChange={(e) => setAppIdea(e.target.value)}
              className="h-14 pl-12 pr-36 text-lg bg-card/50 border-border/50 rounded-xl placeholder:text-muted-foreground/60"
            />
            {isSignedIn ? (
              <Button
                type="submit"
                className="absolute right-2 top-2 h-10 px-4 glow-button rounded-lg"
                disabled={!appIdea.trim()}
              >
                Start building
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  type="button"
                  className="absolute right-2 top-2 h-10 px-4 glow-button rounded-lg"
                >
                  Start building
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </SignInButton>
            )}
          </div>
        </motion.form>

        {/* Trust line */}
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Free to start. No credit card required.
        </motion.p>

        {/* Social proof teaser */}
        <motion.div
          className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["AC", "SM", "JW"].map((initials, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium text-primary"
                >
                  {initials}
                </div>
              ))}
            </div>
            <span>Join 500+ builders</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

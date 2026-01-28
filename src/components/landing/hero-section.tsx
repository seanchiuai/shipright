"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

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

interface HeroSectionProps {
  onOpenModal?: (idea: string) => void;
}

export function HeroSection({ onOpenModal }: HeroSectionProps) {
  const [appIdea, setAppIdea] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = () => {
    if (onOpenModal) {
      onOpenModal(appIdea);
    }
  };

  return (
    <section className="py-20 md:py-24 text-center relative">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-primary rounded-full text-sm font-semibold mb-8"
          style={{ animation: "badgeGlow 3s ease-in-out infinite" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="w-2 h-2 bg-green-500 rounded-full"
            style={{ animation: "pulse 2s infinite" }}
          />
          Now in beta
        </motion.div>

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
          Go from app idea to <strong className="text-foreground font-semibold">GitHub repo</strong> in 10 minutes.
          No coding required.
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
              className="flex-1 border-none outline-none text-lg resize-none bg-transparent min-h-[80px] leading-relaxed placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSubmit}
              className="w-[52px] h-[52px] bg-primary text-white border-none rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:bg-[#0052cc] hover:scale-110 hover:shadow-[0_6px_20px_rgba(0,102,255,0.3)]"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Trust line */}
        <motion.p
          className="text-sm text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Free during beta. No credit card required.
        </motion.p>

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

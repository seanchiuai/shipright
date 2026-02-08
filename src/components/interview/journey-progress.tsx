"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lightbulb, MessageCircle, Sparkles, Rocket } from "lucide-react";

interface JourneyProgressProps {
  currentStep: number;
  currentRound?: number;
  totalRounds?: number;
}

const steps = [
  { icon: Lightbulb, label: "Your Idea" },
  { icon: MessageCircle, label: "Questions" },
  { icon: Sparkles, label: "Review" },
  { icon: Rocket, label: "Build!" },
];

export function JourneyProgress({ currentStep, currentRound = 1, totalRounds = 3 }: JourneyProgressProps) {
  const journeyStep = currentStep - 1;

  return (
    <div className="relative">
      {/* Background track */}
      <div className="absolute top-5 left-0 right-0 h-px bg-border" />

      {/* Progress fill */}
      <motion.div
        className="absolute top-5 left-0 h-px bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: `${(journeyStep / (steps.length - 1)) * 100}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = index === journeyStep;
          const isComplete = index < journeyStep;
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex flex-col items-center">
              {/* Step circle */}
              <motion.div
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-card border-[1.5px] border-primary text-primary shadow-sm"
                      : "bg-card border-[1.5px] border-border text-muted-foreground"
                )}
                animate={
                  isActive
                    ? {
                        scale: [1, 1.04, 1],
                      }
                    : {}
                }
                transition={
                  isActive
                    ? {
                        repeat: Infinity,
                        duration: 2.5,
                        ease: "easeInOut",
                      }
                    : {}
                }
              >
                <Icon className="w-4 h-4" />

                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-primary/50"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.3, 0], scale: [1, 1.4, 1.4] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-[11px] font-medium tracking-wide transition-colors",
                  isActive ? "text-foreground" : isComplete ? "text-foreground/80" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>

              {/* Round indicator for step 2 */}
              {index === 1 && currentStep === 2 && (
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: totalRounds }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i < currentRound ? "bg-primary" : "bg-border"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

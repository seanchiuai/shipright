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
  // Map interview steps to journey steps (1->0, 2->1, 3->2, done->3)
  const journeyStep = currentStep - 1;

  return (
    <div className="relative">
      {/* Background track */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border/50" />

      {/* Progress fill */}
      <motion.div
        className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/70"
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
                    ? "bg-primary text-white"
                    : isActive
                      ? "bg-white border-2 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-white border-2 border-border/50 text-muted-foreground"
                )}
                animate={
                  isActive
                    ? {
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 4px 20px rgba(240, 140, 58, 0.2)",
                          "0 4px 30px rgba(240, 140, 58, 0.3)",
                          "0 4px 20px rgba(240, 140, 58, 0.2)",
                        ],
                      }
                    : {}
                }
                transition={
                  isActive
                    ? {
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      }
                    : {}
                }
              >
                <Icon className="w-4 h-4" />

                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.5, 0], scale: [1, 1.4, 1.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground"
                )}
                animate={isActive ? { y: [0, -2, 0] } : {}}
                transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
              >
                {step.label}
              </motion.span>

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

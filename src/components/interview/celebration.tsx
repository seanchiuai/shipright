"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationBurstProps {
  trigger: boolean;
  onComplete?: () => void;
  intensity?: "subtle" | "medium" | "epic";
}

export function CelebrationBurst({
  trigger,
  onComplete,
  intensity = "medium",
}: CelebrationBurstProps) {
  useEffect(() => {
    if (!trigger) return;

    const particleCount =
      intensity === "subtle" ? 30 : intensity === "medium" ? 60 : 100;

    confetti({
      particleCount,
      spread: 70,
      colors: ["#0066ff", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899"],
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });

    const timer = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(timer);
  }, [trigger, intensity, onComplete]);

  return null;
}

interface EncouragementToastProps {
  message: string;
  show: boolean;
  onComplete?: () => void;
}

const encouragements = [
  "Nice insight!",
  "Love that idea!",
  "Getting clearer!",
  "Great detail!",
  "Perfect!",
  "Excellent!",
];

export function EncouragementToast({
  message,
  show,
  onComplete,
}: EncouragementToastProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed top-20 left-1/2 z-50"
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white font-medium shadow-lg shadow-primary/25 flex items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
            >
              ✨
            </motion.span>
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function getRandomEncouragement(): string {
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

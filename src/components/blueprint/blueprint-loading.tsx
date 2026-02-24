"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const loadingMessages = [
  "Analyzing your requirements...",
  "Mapping out user personas...",
  "Designing core workflows...",
  "Crafting tech recommendations...",
  "Building your blueprint...",
];

export function BlueprintLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="w-8 h-8 text-primary" />
      </motion.div>

      <h3 className="text-xl font-medium mb-2">Crafting your blueprint...</h3>
      <p className="text-muted-foreground text-sm text-center max-w-md mb-8">
        We&apos;re generating a comprehensive product blueprint from your interview. This usually takes 15-30 seconds.
      </p>

      <div className="space-y-2 w-full max-w-xs">
        {loadingMessages.map((msg, i) => (
          <motion.div
            key={msg}
            className="flex items-center gap-2 text-[13px] text-muted-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: [0, 1, 1, 0.5] }}
            transition={{
              delay: i * 4,
              duration: 4,
              repeat: Infinity,
              repeatDelay: loadingMessages.length * 4 - 4,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
            {msg}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

interface InterviewBackgroundProps {
  progress?: number; // 0-100
}

export function InterviewBackground({ progress = 0 }: InterviewBackgroundProps) {
  const warmth = progress / 100;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base — dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            168deg,
            hsl(220, ${30 + warmth * 10}%, ${4 + warmth * 1}%) 0%,
            hsl(225, ${25 + warmth * 8}%, ${5 + warmth * 1}%) 40%,
            hsl(230, ${20 + warmth * 12}%, ${6 + warmth * 1}%) 100%
          )`,
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Top-right blue glow */}
      <motion.div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(220, 70%, 50%, ${0.06 + warmth * 0.04}) 0%, transparent 65%)`,
        }}
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: "easeInOut",
        }}
      />

      {/* Bottom-left purple accent */}
      <motion.div
        className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(260, 50%, 40%, ${0.05 + warmth * 0.03}) 0%, transparent 65%)`,
        }}
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          repeat: Infinity,
          duration: 15,
          ease: "easeInOut",
        }}
      />

      {/* Faint horizontal rule accent */}
      <div
        className="absolute top-[38%] left-[10%] right-[10%] h-px opacity-[0.06]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

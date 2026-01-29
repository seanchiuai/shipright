"use client";

import { motion } from "framer-motion";

interface InterviewBackgroundProps {
  progress?: number; // 0-100
}

export function InterviewBackground({ progress = 0 }: InterviewBackgroundProps) {
  // Map progress to warmth — subtle hue shift from cool cream to warm amber
  const warmth = progress / 100;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base — warm paper gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            168deg,
            hsl(40, ${18 + warmth * 12}%, 97%) 0%,
            hsl(35, ${14 + warmth * 10}%, 95%) 40%,
            hsl(30, ${10 + warmth * 15}%, 94%) 100%
          )`,
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Top-right warm glow */}
      <motion.div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(35, 50%, 85%, ${0.15 + warmth * 0.1}) 0%, transparent 65%)`,
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

      {/* Bottom-left cool accent */}
      <motion.div
        className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(25, 30%, 88%, ${0.12 + warmth * 0.08}) 0%, transparent 65%)`,
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
        className="absolute top-[38%] left-[10%] right-[10%] h-px opacity-[0.04]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #a08060 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

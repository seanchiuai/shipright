"use client";

import { motion } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const trustPoints = [
  "No credit card required",
  "10 minutes to repo",
  "Own your code forever",
];

export function FinalCTA() {
  return (
    <section
      className="py-24 text-center relative"
      style={{
        background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-warm) 100%)",
      }}
    >
      {/* Pulsing glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0, 102, 255, 0.08) 0%, transparent 70%)",
          animation: "ctaPulse 4s ease-in-out infinite",
        }}
      />

      <div className="max-w-[1140px] mx-auto px-6 relative z-10">
        <motion.h2
          className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Stop researching. Start building.
        </motion.h2>

        <motion.p
          className="text-xl text-muted-foreground mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Your app idea + 10 minutes = a GitHub repo ready for vibe coding.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SignInButton mode="modal">
            <Button
              size="lg"
              className="glow-button text-lg px-10 py-6 rounded-full font-semibold"
            >
              Start building free
            </Button>
          </SignInButton>
        </motion.div>

        {/* Trust points */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {trustPoints.map((point, index) => (
            <span
              key={index}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
              {point}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

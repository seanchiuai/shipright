"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Shield,
  CheckCircle,
  Layout,
  Download,
  Zap,
} from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save days of setup time",
    description:
      "Go from app idea to working codebase in 10 minutes, not days. AI picks the perfect template for you.",
  },
  {
    icon: Shield,
    title: "Eliminate endless error loops",
    description:
      "CLAUDE.md gives AI agents the context they need. No more fixing mistakes AI made because it didn't understand your project.",
  },
  {
    icon: CheckCircle,
    title: "Always know what to build next",
    description:
      "TASKS.md gives you a clear roadmap. No more staring at a blank screen wondering where to start.",
  },
  {
    icon: Layout,
    title: "Keep your project organized",
    description:
      "PRD.md documents the \"why\" behind features. You and AI stay aligned as your project grows.",
  },
  {
    icon: Download,
    title: "Own your code forever",
    description:
      "It's a GitHub repo in your account. No platform lock-in. Take it anywhere, anytime.",
  },
  {
    icon: Zap,
    title: "Build like an expert",
    description:
      "Skills directory gives AI domain knowledge from experienced developers. Build like you've done this before.",
  },
];

export function ValueProp() {
  return (
    <section id="features" className="py-20 bg-muted">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal mb-4">
            Ship faster. Build with confidence.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Stop wasting time on setup. Start building features that matter.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-card border border-border rounded-2xl p-7 transition-all duration-300 relative overflow-hidden group hover:border-primary hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(240,140,58,0.1)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Icon */}
              <div className="w-12 h-12 bg-accent rounded-[14px] flex items-center justify-center text-primary mb-5 relative z-10 transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_4px_15px_rgba(240,140,58,0.3)]">
                <benefit.icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 relative z-10">
                {benefit.title}
              </h3>
              <p className="text-base text-muted-foreground relative z-10">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

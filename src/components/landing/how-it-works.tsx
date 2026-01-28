"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Describe",
    description:
      "Tell us what you want to build in plain English. AI guides you through what's possible, helping you nail down features and requirements.",
  },
  {
    number: "02",
    title: "Match",
    description:
      "We analyze your needs and match you to the perfect template. Production-ready code, optimized for vibe coding from day one.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Get a GitHub repo with all the scaffolding AI needs to understand your project. Start vibe coding immediately.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
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
            From idea to codebase in 3 steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No guessing. No decision paralysis. Just clarity and code.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="bg-card border border-border rounded-2xl p-8 transition-all duration-300 relative overflow-hidden group hover:border-primary hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,102,255,0.1)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Top accent line on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Step number */}
              <div className="inline-flex items-center justify-center w-10 h-10 bg-accent text-primary rounded-xl font-bold text-base mb-5 transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_4px_15px_rgba(0,102,255,0.3)]">
                {step.number}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-[0.9375rem] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

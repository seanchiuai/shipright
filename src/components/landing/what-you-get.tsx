"use client";

import { motion } from "framer-motion";
import { Check, Folder, FileText } from "lucide-react";

const features = [
  {
    title: "Understand how your app works",
    description: "explains like your 10 year old",
  },
  {
    title: "AI picks your template",
    description: "customized to your app",
  },
  {
    title: "GitHub repo you own",
    description: "you own your code",
  },
  {
    title: "Vibe code ready",
    description: "AI optimized scaffolding from top vibe coders",
  },
];

export function WhatYouGet() {
  return (
    <section id="what-you-get" className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal mb-4">
                What you get in your repo
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything AI needs to understand your project from day one.
              </p>
            </div>

            <div className="space-y-5">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <strong className="font-semibold">{feature.title}</strong>{" "}
                    <span className="text-muted-foreground">
                      — {feature.description}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side - File tree */}
          <motion.div
            className="bg-card border border-border rounded-2xl p-8 font-mono text-sm transition-all hover:shadow-[0_8px_32px_rgba(0,102,255,0.1)] relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Top accent line on hover */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-5 font-sans">
              Your Generated Repo
            </div>

            <div className="space-y-1.5">
              {/* Root folder */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Folder className="w-4 h-4" />
                my-saas-app/
              </div>

              {/* Indented items */}
              <div className="ml-5 space-y-1.5">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <FileText className="w-4 h-4" />
                  CLAUDE.md
                  <span className="text-[0.6875rem] bg-accent text-primary px-2 py-0.5 rounded-full ml-auto font-sans">
                    AI context
                  </span>
                </div>
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <FileText className="w-4 h-4" />
                  TASKS.md
                  <span className="text-[0.6875rem] bg-accent text-primary px-2 py-0.5 rounded-full ml-auto font-sans">
                    Backlog
                  </span>
                </div>
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <FileText className="w-4 h-4" />
                  PRD.md
                  <span className="text-[0.6875rem] bg-accent text-primary px-2 py-0.5 rounded-full ml-auto font-sans">
                    Requirements
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="w-4 h-4" />
                  skills/
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="w-4 h-4" />
                  src/
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  package.json
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

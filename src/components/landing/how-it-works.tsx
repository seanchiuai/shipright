"use client";

import { FadeIn } from "./fade-in";
import { StaggerChildren, StaggerItem } from "./stagger-children";
import { MessageSquare, Target, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Describe your app",
    description:
      "Tell us what you want to build in plain English. No technical jargon needed.",
    icon: MessageSquare,
  },
  {
    number: "02",
    title: "We match a template",
    description:
      "AI analyzes your idea and selects the perfect starting point from our library.",
    icon: Target,
  },
  {
    number: "03",
    title: "Get your repo",
    description:
      "Receive a GitHub repo with CLAUDE.md, TASKS.md, and production-ready code.",
    icon: Rocket,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From idea to buildable repo in three simple steps
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step) => (
            <StaggerItem key={step.number}>
              <div className="relative p-6 rounded-2xl glass-card transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-sm font-mono text-primary mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

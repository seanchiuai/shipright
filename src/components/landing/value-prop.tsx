"use client";

import { FadeIn } from "./fade-in";
import { StaggerChildren, StaggerItem } from "./stagger-children";
import {
  XCircle,
  RefreshCw,
  HelpCircle,
  DollarSign,
  Cpu,
  GitBranch,
  Target,
  FileText,
} from "lucide-react";

const painPoints = [
  {
    icon: XCircle,
    text: "AI gives you code you can't run",
  },
  {
    icon: RefreshCw,
    text: "Every prompt needs 20 minutes of context",
  },
  {
    icon: HelpCircle,
    text: "No idea how to structure a real project",
  },
  {
    icon: DollarSign,
    text: "Hosted tools cost $200/mo and lock you in",
  },
];

const benefits = [
  {
    icon: Cpu,
    title: "AI-ready from day one",
    description:
      "CLAUDE.md tells AI exactly how to build your app. No prompt engineering required.",
  },
  {
    icon: GitBranch,
    title: "Your code, your repo",
    description:
      "Real GitHub repo you own. No vendor lock-in. Deploy anywhere.",
  },
  {
    icon: Target,
    title: "Matched to your idea",
    description:
      "Not a generic starter. A template chosen specifically for what you're building.",
  },
  {
    icon: FileText,
    title: "Plan before you code",
    description:
      "PRD.md + TASKS.md ensure AI builds what you need, not what it guesses.",
  },
];

export function ValueProp() {
  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Problem side */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              You&apos;ve heard about vibe coding.
              <br />
              <span className="text-muted-foreground">
                But where do you start?
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              You&apos;ve watched the tweets. You&apos;ve seen founders ship
              apps in a weekend. But when you try it yourself, you hit the same
              walls everyone does.
            </p>
          </FadeIn>

          <StaggerChildren className="space-y-4">
            {painPoints.map((point, i) => (
              <StaggerItem key={i}>
                <div className="flex items-center gap-4 p-4 rounded-xl glass-card transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <point.icon className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-foreground font-medium">
                    {point.text}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>

        {/* Solution side */}
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Shipright gives you the{" "}
            <span className="text-gradient">perfect starting point</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop wrestling with setup. Start building features.
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {benefits.map((benefit, i) => (
            <StaggerItem key={i}>
              <div className="flex gap-4 p-6 rounded-2xl glass-card transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

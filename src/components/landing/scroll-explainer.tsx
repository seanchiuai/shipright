"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Folder, FileText, Check, Sparkles } from "lucide-react";

/* ─── Visual mockups ─────────────────────────────────────── */

function ChatBubbleMockup() {
  return (
    <div className="flex flex-col w-full bg-[#080b14] rounded-2xl p-7 gap-3.5 border border-white/[0.06] shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="text-[11px] text-white/20 ml-2 font-mono tracking-wide">interview</span>
      </div>
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-400/20">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="bg-white/[0.06] rounded-2xl rounded-tl-md px-4 py-2.5 text-[13px] text-white/70 leading-relaxed">
          What kind of app are you building?
        </div>
      </div>
      <div className="flex gap-3 items-start justify-end">
        <div className="bg-blue-500/10 border border-blue-400/15 rounded-2xl rounded-tr-md px-4 py-2.5 text-[13px] text-white/90 leading-relaxed">
          A marketplace for freelance designers
        </div>
      </div>
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-400/20">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="bg-white/[0.06] rounded-2xl rounded-tl-md px-4 py-2.5 text-[13px] text-white/70 leading-relaxed">
          Do you need payment processing? What about Stripe?
        </div>
      </div>
      <div className="flex gap-3 items-start justify-end">
        <div className="bg-blue-500/10 border border-blue-400/15 rounded-2xl rounded-tr-md px-4 py-2.5 text-[13px] text-white/90 leading-relaxed">
          Yes — subscriptions + one-time payments
        </div>
      </div>
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-400/20">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="bg-white/[0.06] rounded-2xl rounded-tl-md px-4 py-2 inline-flex">
          <div className="flex gap-1 items-center">
            <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-pulse [animation-delay:200ms]" />
            <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCardsMockup() {
  const templates = [
    { name: "Next.js + Convex SaaS", match: 94, selected: true },
    { name: "React + Supabase", match: 71, selected: false },
    { name: "Next.js + Prisma", match: 58, selected: false },
    { name: "Remix + Drizzle", match: 42, selected: false },
  ];
  return (
    <div className="flex flex-col w-full bg-[#080b14] rounded-2xl p-7 gap-3 border border-white/[0.06] shadow-2xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-white/20 uppercase tracking-[0.15em] font-mono">
          Template matching
        </span>
        <span className="text-[11px] text-blue-400/60 font-mono">4 found</span>
      </div>
      {templates.map((t) => (
        <div
          key={t.name}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 transition-all ${
            t.selected
              ? "bg-emerald-500/[0.08] border border-emerald-400/25 shadow-[0_0_24px_-6px_rgba(16,185,129,0.15)]"
              : "bg-white/[0.02] border border-white/[0.05]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {t.selected && <Check className="w-4 h-4 text-emerald-400" />}
            <span className={`font-mono text-[13px] ${t.selected ? "text-emerald-300" : "text-white/30"}`}>
              {t.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-14 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${t.selected ? "bg-emerald-400" : "bg-white/10"}`}
                style={{ width: `${t.match}%` }}
              />
            </div>
            <span className={`text-[11px] font-mono tabular-nums ${t.selected ? "text-emerald-400" : "text-white/20"}`}>
              {t.match}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FileTreeMockup() {
  const files = [
    { name: "CLAUDE.md", type: "file" as const, glow: true, label: "AI context" },
    { name: "TASKS.md", type: "file" as const, glow: true, label: "Backlog" },
    { name: "PRD.md", type: "file" as const, glow: true, label: "Requirements" },
    { name: ".claude/", type: "folder" as const, glow: true },
    { name: "skills/", type: "folder" as const, glow: false },
    { name: "src/", type: "folder" as const, glow: false },
    { name: "package.json", type: "file" as const, glow: false },
    { name: "tsconfig.json", type: "file" as const, glow: false },
  ];
  return (
    <div className="flex flex-col w-full bg-[#080b14] rounded-2xl p-7 font-mono border border-white/[0.06] shadow-2xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="text-[11px] text-white/20 ml-2 tracking-wide">~/my-saas-app</span>
      </div>
      <div className="space-y-px">
        <div className="flex items-center gap-2 text-white/40 py-1 text-[13px]">
          <Folder className="w-4 h-4" />
          <span>my-saas-app/</span>
        </div>
        <div className="ml-5 space-y-px">
          {files.map((f) => (
            <div
              key={f.name}
              className={`flex items-center gap-2 py-1 text-[13px] ${
                f.glow ? "text-emerald-400" : "text-white/20"
              }`}
            >
              {f.type === "folder" ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>{f.name}</span>
              {"label" in f && f.label && (
                <span className="text-[10px] px-1.5 py-px rounded-md bg-emerald-500/10 text-emerald-400/80 border border-emerald-400/15">
                  {f.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Step data ──────────────────────────────────────────── */

const steps = [
  {
    title: "Describe your idea",
    description:
      "An AI-guided interview asks the right questions to understand your app — features, users, integrations. No technical knowledge needed.",
    content: <ChatBubbleMockup />,
  },
  {
    title: "Get matched to a template",
    description:
      "We analyze your requirements and match you to a production-ready template. Not a generic starter — a real foundation for your specific app.",
    content: <TemplateCardsMockup />,
  },
  {
    title: "AI scaffolding built in",
    description:
      "Your repo ships with CLAUDE.md, TASKS.md, and PRD.md — files that give AI coding tools full context about your project from day one.",
    content: <FileTreeMockup />,
  },
];

/* ─── Individual scroll step ─────────────────────────────── */

function ScrollStep({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const step = steps[index];
  const ref = useRef<HTMLDivElement>(null);
  const isLast = index === total - 1;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // All hooks called unconditionally — use isLast to pick keyframes
  const textOpacity = useTransform(
    scrollYProgress,
    isLast ? [0, 0.3, 0.5, 1] : [0, 0.3, 0.5, 0.7, 1],
    isLast ? [0, 1, 1, 1]     : [0, 1, 1, 1, 0],
  );
  const textY = useTransform(
    scrollYProgress,
    isLast ? [0, 0.3, 1] : [0, 0.3, 0.7, 1],
    isLast ? [60, 0, 0]  : [60, 0, 0, -40],
  );
  const visualOpacity = useTransform(
    scrollYProgress,
    isLast ? [0, 0.25, 0.45, 1] : [0, 0.25, 0.45, 0.75, 1],
    isLast ? [0, 0, 1, 1]       : [0, 0, 1, 1, 0],
  );
  const visualScale = useTransform(
    scrollYProgress,
    isLast ? [0, 0.35, 0.5, 1] : [0, 0.35, 0.5, 0.75, 1],
    isLast ? [0.92, 0.92, 1, 1] : [0.92, 0.92, 1, 1, 0.96],
  );

  return (
    <div ref={ref} className="h-screen flex items-center relative">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Text side */}
          <motion.div
            className="w-full lg:w-[42%] relative z-10"
            style={{ opacity: textOpacity, y: textY }}
          >
            <span className="font-mono text-sm text-blue-400/70 mb-4 block tracking-wider">
              0{index + 1}
            </span>
            <h3 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] tracking-tight text-white mb-5 leading-[1.1]">
              {step.title}
            </h3>
            <p className="text-base md:text-lg text-white/40 leading-relaxed max-w-md">
              {step.description}
            </p>
          </motion.div>

          {/* Visual side */}
          <motion.div
            className="w-full lg:w-[58%]"
            style={{ opacity: visualOpacity, scale: visualScale }}
          >
            {step.content}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export function ScrollExplainer() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });

  // Gradient transition opacity — fades in as section approaches
  const gradientOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0.5, 1]);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative">
      {/* Smooth atmosphere transition */}
      <motion.div
        className="h-[70vh] relative overflow-hidden"
        style={{ opacity: gradientOpacity }}
      >
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, transparent 0%, #0a0d16 100%)",
        }} />
      </motion.div>

      {/* Deep space canvas */}
      <div className="relative bg-[#0a0d16] overflow-hidden">
        {/* Ambient glow — large soft orb */}
        <div className="absolute top-1/4 right-0 w-[800px] h-[800px] rounded-full bg-blue-500/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-0 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.03] blur-[100px] pointer-events-none" />

        {/* Static star field */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[
            { pos: "top-[8%] left-[12%]", o: 0.2 },  { pos: "top-[15%] left-[78%]", o: 0.3 },
            { pos: "top-[22%] left-[45%]", o: 0.15 }, { pos: "top-[35%] left-[88%]", o: 0.25 },
            { pos: "top-[42%] left-[5%]", o: 0.35 },  { pos: "top-[55%] left-[62%]", o: 0.2 },
            { pos: "top-[65%] left-[30%]", o: 0.3 },  { pos: "top-[72%] left-[92%]", o: 0.15 },
            { pos: "top-[80%] left-[18%]", o: 0.25 }, { pos: "top-[88%] left-[55%]", o: 0.2 },
            { pos: "top-[12%] left-[35%]", o: 0.35 }, { pos: "top-[48%] left-[72%]", o: 0.15 },
            { pos: "top-[28%] left-[8%]", o: 0.3 },   { pos: "top-[60%] left-[48%]", o: 0.2 },
            { pos: "top-[75%] left-[82%]", o: 0.25 }, { pos: "top-[38%] left-[25%]", o: 0.3 },
            { pos: "top-[92%] left-[40%]", o: 0.15 }, { pos: "top-[5%] left-[58%]", o: 0.2 },
          ].map((star, i) => (
            <div
              key={i}
              className={`absolute w-px h-px bg-white rounded-full ${star.pos}`}
              style={{ opacity: star.o }}
            />
          ))}
        </div>

        {/* Section heading */}
        <div className="relative z-10 flex items-center justify-center h-[80vh]">
          <div className="text-center px-6">
            <p className="text-[13px] font-mono tracking-[0.2em] uppercase text-blue-400/50 mb-5">
              How it works
            </p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.08] tracking-tight text-white max-w-2xl mx-auto">
              From idea to AI-ready repo
            </h2>
          </div>
        </div>

        {/* Scroll steps — each step is 100vh, text + visual animate per-element */}
        <div className="relative z-10">
          {steps.map((_, index) => (
            <ScrollStep key={index} index={index} total={steps.length} />
          ))}
        </div>

        {/* Bottom fade into next section */}
        <div className="h-32" style={{
          background: "linear-gradient(to bottom, transparent, #1c1917)",
        }} />
      </div>
    </section>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Folder, FileText, Check, Sparkles } from "lucide-react";

/* ─── Animation config ───────────────────────────────────── */

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ─── Typing indicator ───────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-foreground/[0.06] rounded-2xl rounded-tl-md px-4 py-2 inline-flex">
        <div className="flex gap-1 items-center">
          <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse [animation-delay:200ms]" />
          <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Chat mockup — simulates a real conversation ────────── */

const chatMessages = [
  { role: "ai" as const, text: "What kind of app are you building?" },
  { role: "user" as const, text: "An AI chatbot that helps students study" },
  { role: "ai" as const, text: "Should users be able to save chat history and share conversations?" },
  { role: "user" as const, text: "Yes — and I want user accounts with Google login" },
];

function ChatBubbleMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10%", amount: 0.3 });
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!inView) {
      setVisible(0);
      setTyping(false);
      setShowSummary(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let idx = 0;

    const showNext = () => {
      if (idx >= chatMessages.length) {
        setTyping(true);
        timers.push(setTimeout(() => {
          setTyping(false);
          setShowSummary(true);
        }, 400));
        return;
      }
      if (chatMessages[idx].role === "ai") {
        setTyping(true);
        timers.push(setTimeout(() => {
          setTyping(false);
          idx++;
          setVisible(idx);
          timers.push(setTimeout(showNext, 300));
        }, 350));
      } else {
        idx++;
        setVisible(idx);
        timers.push(setTimeout(showNext, 900));
      }
    };

    timers.push(setTimeout(showNext, 400));
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="flex flex-col w-full bg-card rounded-2xl p-7 gap-3.5 border border-border shadow-2xl overflow-hidden min-h-[280px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="text-[11px] text-foreground/20 ml-2 font-mono tracking-wide">interview</span>
      </div>

      {chatMessages.slice(0, visible).map((msg, i) => (
        <motion.div
          key={i}
          className={`flex gap-3 items-start ${msg.role === "user" ? "justify-end" : ""}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          {msg.role === "ai" && (
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
          <div
            className={
              msg.role === "ai"
                ? "bg-foreground/[0.06] rounded-2xl rounded-tl-md px-4 py-2.5 text-[13px] text-foreground/70 leading-relaxed"
                : "bg-primary/10 border border-primary/15 rounded-2xl rounded-tr-md px-4 py-2.5 text-[13px] text-foreground/90 leading-relaxed"
            }
          >
            {msg.text}
          </div>
        </motion.div>
      ))}

      {typing && !showSummary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <TypingDots />
        </motion.div>
      )}

      {showSummary && (
        <motion.div
          className="mt-1 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <p className="text-[11px] font-mono text-primary/50 uppercase tracking-wider mb-1.5">Summary</p>
          <p className="text-[12px] text-foreground/60 leading-relaxed">
            AI study chatbot — Google auth, saved chat history, shareable conversations
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Template matching mockup — scans & matches ─────────── */

const templateData = [
  { name: "AI Chat + Vercel AI SDK", match: 96, selected: true },
  { name: "SaaS Starter + Stripe", match: 62, selected: false },
  { name: "Dashboard + Analytics", match: 45, selected: false },
  { name: "E-commerce Storefront", match: 31, selected: false },
];

function TemplateCardsMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10%", amount: 0.3 });
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (!inView) {
      setCounts([0, 0, 0, 0]);
      setShowCheck(false);
      return;
    }

    const targets = templateData.map((t) => t.match);
    const duration = 900;
    let rafId: number;

    const timer = setTimeout(() => {
      const startTime = performance.now();
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCounts(targets.map((t) => Math.round(t * eased)));
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setShowCheck(true);
        }
      };
      rafId = requestAnimationFrame(tick);
    }, 700);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [inView]);

  return (
    <div ref={ref} className="flex flex-col w-full bg-card rounded-2xl p-7 gap-3 border border-border shadow-2xl">
      <motion.div
        className="flex items-center justify-between mb-1"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-[11px] text-foreground/20 uppercase tracking-[0.15em] font-mono">
          Template matching
        </span>
        <span className="text-[11px] text-primary/60 font-mono">4 found</span>
      </motion.div>
      {templateData.map((t, i) => (
        <motion.div
          key={t.name}
          className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${
            t.selected && showCheck
              ? "bg-emerald-500/[0.08] border border-emerald-400/25 shadow-[0_0_24px_-6px_rgba(16,185,129,0.15)]"
              : "bg-foreground/[0.02] border border-border"
          }`}
          initial={{ opacity: 0, x: 24 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
          transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease }}
        >
          <div className="flex items-center gap-2.5">
            {t.selected && showCheck && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Check className="w-4 h-4 text-emerald-400" />
              </motion.div>
            )}
            <span
              className={`font-mono text-[13px] transition-colors duration-300 ${
                t.selected && showCheck ? "text-emerald-300" : "text-foreground/30"
              }`}
            >
              {t.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-14 h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  t.selected && showCheck ? "bg-emerald-400" : "bg-foreground/10"
                }`}
                style={{ width: `${counts[i]}%` }}
              />
            </div>
            <span
              className={`text-[11px] font-mono tabular-nums w-7 text-right transition-colors duration-300 ${
                t.selected && showCheck ? "text-emerald-400" : "text-foreground/20"
              }`}
            >
              {counts[i]}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── File tree mockup — files appear as if scaffolded ──── */

const fileData = [
  { name: "CLAUDE.md", type: "file" as const, glow: true, label: "AI context" },
  { name: "TASKS.md", type: "file" as const, glow: true, label: "Backlog" },
  { name: "PRD.md", type: "file" as const, glow: true, label: "Requirements" },
  { name: ".claude/", type: "folder" as const, glow: true },
  { name: "skills/", type: "folder" as const, glow: false },
  { name: "src/", type: "folder" as const, glow: false },
  { name: "package.json", type: "file" as const, glow: false },
  { name: "tsconfig.json", type: "file" as const, glow: false },
];

function FileTreeMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10%", amount: 0.3 });
  const [visibleFiles, setVisibleFiles] = useState(0);

  useEffect(() => {
    if (!inView) {
      setVisibleFiles(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    fileData.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleFiles(i + 1), 300 + i * 120)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="flex flex-col w-full bg-card rounded-2xl p-7 font-mono border border-border shadow-2xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="text-[11px] text-foreground/20 ml-2 tracking-wide">~/my-saas-app</span>
      </div>
      <div className="space-y-px">
        {/* Root folder */}
        <motion.div
          className="flex items-center gap-2 text-foreground/40 py-1 text-[13px]"
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
          transition={{ delay: 0.1, duration: 0.4, ease }}
        >
          <Folder className="w-4 h-4" />
          <span>my-saas-app/</span>
        </motion.div>
        {/* File entries — appear one by one */}
        <div className="ml-5 space-y-px">
          {fileData.slice(0, visibleFiles).map((f) => (
            <motion.div
              key={f.name}
              className={`flex items-center gap-2 py-1 text-[13px] ${
                f.glow ? "text-emerald-400" : "text-foreground/20"
              }`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease }}
            >
              {f.type === "folder" ? (
                <Folder className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{f.name}</span>
              {"label" in f && f.label && (
                <motion.span
                  className="text-[10px] px-1.5 py-px rounded-md bg-emerald-500/10 text-emerald-400/80 border border-emerald-400/15"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.25, ease }}
                >
                  {f.label}
                </motion.span>
              )}
            </motion.div>
          ))}
          {/* Blinking cursor at the end */}
          {visibleFiles > 0 && visibleFiles < fileData.length && (
            <div className="flex items-center gap-2 py-1 text-[13px] text-foreground/20">
              <div className="w-1.5 h-3.5 bg-emerald-400/60 animate-pulse rounded-sm" />
            </div>
          )}
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
    <div ref={ref} className="h-[75vh] flex items-center relative">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14">
          {/* Text side */}
          <motion.div
            className="w-full lg:w-[42%] relative z-10"
            style={{ opacity: textOpacity, y: textY }}
          >
            <span className="font-mono text-sm text-primary/70 mb-2 block tracking-wider">
              0{index + 1}
            </span>
            <h3 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] tracking-tight text-foreground mb-3 leading-[1.1]">
              {step.title}
            </h3>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
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
  return (
    <section id="how-it-works" className="relative">
      {/* Seamless dark canvas */}
      <div className="relative bg-background overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-1/4 right-0 w-[800px] h-[800px] pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(59,130,246,0.03) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/3 left-0 w-[600px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(99,102,241,0.03) 0%, transparent 70%)" }}
        />

        {/* Star field */}
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
              className={`absolute w-px h-px bg-foreground rounded-full ${star.pos}`}
              style={{ opacity: star.o }}
            />
          ))}
        </div>

        {/* Section heading */}
        <div className="relative z-10 flex items-center justify-center h-[40vh]">
          <div className="text-center px-6">
            <p className="text-[13px] font-mono tracking-[0.2em] uppercase text-primary/50 mb-3">
              How it works
            </p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.08] tracking-tight text-foreground max-w-2xl mx-auto">
              From idea to AI-ready repo
            </h2>
          </div>
        </div>

        {/* Scroll steps */}
        <div className="relative z-10">
          {steps.map((_, index) => (
            <ScrollStep key={index} index={index} total={steps.length} />
          ))}
        </div>
      </div>
    </section>
  );
}

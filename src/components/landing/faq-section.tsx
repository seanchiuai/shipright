"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What exactly do I get?",
    answer:
      "A GitHub repository with a production-ready template matched to your requirements, plus AI-optimized scaffolding files (CLAUDE.md, TASKS.md, PRD.md) that help AI coding tools understand your project.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You describe your app in plain English. After you get your repo, you use tools like Claude Code or Cursor to build features by describing what you want.",
  },
  {
    question: "Does this work with Cursor / Claude Code / Windsurf?",
    answer:
      "Yes. The repo works with any AI coding tool. The scaffolding is optimized for Claude Code but helps any AI agent understand your project.",
  },
  {
    question: "What happens to my code?",
    answer:
      "It's yours. The repo is created in your GitHub account. We don't host it and don't have access after creation.",
  },
  {
    question: "What's the catch?",
    answer:
      "No catch. Plans start at $15/month. No lock-in, no hidden fees. Cancel anytime.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16">
          {/* Left header */}
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              FAQ
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight tracking-tight">
              Common questions
            </h2>
          </div>

          {/* Right - questions */}
          <div>
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border">
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? -1 : index)
                  }
                  className="w-full py-5 flex items-center justify-between text-left group"
                >
                  <span className="text-[0.9375rem] font-medium pr-4 group-hover:text-muted-foreground transition-colors">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openIndex === index ? "max-h-48 pb-5" : "max-h-0"
                  }`}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed pr-8">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

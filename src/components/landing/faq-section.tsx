"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "What exactly do I get?",
    answer:
      "A GitHub repository with a production-ready template matched to your requirements, plus AI-optimized scaffolding files (CLAUDE.md, TASKS.md, PRD.md) that help Claude Code understand your project.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You describe your app in plain English. After you get your repo, you can use Claude Code or Cursor to build features by describing what you want.",
  },
  {
    question: "Can I use this with Cursor / Claude Code / Windsurf?",
    answer:
      "Yes. The repo works with any AI coding tool. The scaffolding is optimized for Claude Code but helps any AI agent.",
  },
  {
    question: "What happens to my code?",
    answer:
      "It's yours. The repo is created in your GitHub account. We don't host it, we don't have access after creation. Take it anywhere.",
  },
  {
    question: "What's the catch?",
    answer:
      "No catch. Free during beta, then $15-30/month. No lock-in, no hidden fees.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="py-20">
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
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about ShipRight.
          </p>
        </motion.div>

        {/* FAQ list */}
        <div className="max-w-[700px] mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="border-b border-border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full py-6 flex items-center justify-between text-left text-lg font-semibold hover:text-primary transition-colors"
              >
                {faq.question}
                <Plus
                  className={`w-5 h-5 transition-transform ${
                    openIndex === index ? "rotate-45" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96 pb-6" : "max-h-0"
                }`}
              >
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

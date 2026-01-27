"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "./fade-in";
import { ArrowRight } from "lucide-react";

const faqs = [
  {
    question: "What is vibe coding?",
    answer:
      "Vibe coding is a development approach where you describe what you want in natural language, and AI writes the code for you. It's about focusing on the 'what' rather than the 'how'. Shipright gives you the perfect foundation to start vibe coding effectively.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No! That's the whole point. Shipright creates a project structure that AI tools (like Claude, Cursor, or GitHub Copilot) can understand and work with. You describe features, AI builds them. You can always learn as you go.",
  },
  {
    question: "What's in the generated repo?",
    answer:
      "You get a complete Next.js project with: CLAUDE.md (project context for AI), TASKS.md (your feature backlog), PRD.md (product requirements), plus all the boilerplate code configured and ready to run.",
  },
  {
    question: "Can I use any AI tool with it?",
    answer:
      "Yes! The CLAUDE.md file works with Claude Code, Cursor, GitHub Copilot, and any AI coding assistant. It's just a markdown file that explains your project to AI - no proprietary format.",
  },
  {
    question: "What if I outgrow Shipright?",
    answer:
      "That's the beauty - you can't outgrow it. You get a real GitHub repo with real code. Want to switch to a different framework? Add custom features? Hire developers? It's your code, do whatever you want.",
  },
  {
    question: "How is this different from Lovable, Bolt, or Base44?",
    answer:
      "Those tools host your app on their platform - you're locked in. Shipright gives you a GitHub repo you own. Deploy to Vercel, Railway, or your own servers. Use any AI tool. No vendor lock-in, ever.",
  },
];

export function FAQSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section id="faq" className="py-20 lg:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Shipright
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Accordion type="single" collapsible className="w-full mb-20">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-border/50"
              >
                <AccordionTrigger className="text-left font-medium hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>

        {/* Integrated CTA */}
        <FadeIn delay={0.3}>
          <div className="text-center p-8 rounded-2xl glass-card">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Ready to start <span className="text-gradient">vibe coding</span>?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Describe your app. Get a production-ready repo. Ship something
              real before your coffee gets cold.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SignInButton mode="modal">
                <Button size="lg" className="glow-button">
                  Start building free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </SignInButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {submitted ? (
                <p className="text-sm text-primary font-medium">
                  You&apos;re on the list! We&apos;ll be in touch.
                </p>
              ) : (
                <form
                  onSubmit={handleWaitlist}
                  className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto"
                >
                  <Input
                    type="email"
                    placeholder="Or join the waitlist..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-card/30 border-border/50"
                  />
                  <Button type="submit" variant="outline" size="default">
                    Join
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

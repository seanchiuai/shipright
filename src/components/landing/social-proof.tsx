"use client";

import { FadeIn } from "./fade-in";
import { StaggerChildren, StaggerItem } from "./stagger-children";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "I went from idea to working prototype in a single afternoon. The CLAUDE.md file is pure magic.",
    author: "Alex Chen",
    role: "Founder, TechStartup",
    avatar: "AC",
  },
  {
    quote:
      "Finally, a tool that gives me real code I can actually modify. No more platform lock-in.",
    author: "Sarah Miller",
    role: "Indie Hacker",
    avatar: "SM",
  },
  {
    quote:
      "The AI just... knows what I'm building. No more explaining my project in every prompt.",
    author: "James Wilson",
    role: "Product Manager",
    avatar: "JW",
  },
];

const logos = [
  { name: "Next.js", text: "Next.js" },
  { name: "Vercel", text: "Vercel" },
  { name: "Convex", text: "Convex" },
  { name: "Clerk", text: "Clerk" },
  { name: "Stripe", text: "Stripe" },
];

export function SocialProof() {
  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo carousel */}
        <FadeIn className="text-center mb-16">
          <p className="text-sm text-muted-foreground mb-6">
            Built with the best tools in the ecosystem
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo, i) => (
              <div
                key={i}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors font-semibold text-lg"
              >
                {logo.text}
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Testimonials */}
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by builders
          </h2>
          <p className="text-lg text-muted-foreground">
            Join founders who ship faster with Shipright
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, i) => (
            <StaggerItem key={i}>
              <div className="p-6 rounded-2xl glass-card transition-all duration-300 h-full flex flex-col">
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <blockquote className="text-foreground mb-6 flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

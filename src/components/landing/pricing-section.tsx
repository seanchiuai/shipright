"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "./fade-in";
import { StaggerChildren, StaggerItem } from "./stagger-children";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Beta",
    price: "Free",
    period: "during beta",
    description: "Try Shipright while we're in beta",
    features: [
      "1 project",
      "Basic templates",
      "GitHub repo generation",
      "Community support",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$15",
    period: "/month",
    description: "For indie hackers and solo founders",
    features: [
      "5 projects",
      "All templates",
      "Priority matching",
      "Email support",
      "Custom branding",
    ],
    cta: "Get started",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "$30",
    period: "/month",
    description: "For teams and agencies",
    features: [
      "Unlimited projects",
      "All templates",
      "Advanced customization",
      "Priority support",
      "Team collaboration",
      "API access",
    ],
    cta: "Get started",
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No usage limits on AI. Pay for projects, not
            prompts.
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <StaggerItem key={i}>
              <div
                className={`relative p-6 rounded-2xl h-full flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? "glass-card border-primary/50 glow-button"
                    : "glass-card"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <SignInButton mode="modal">
                  <Button
                    className={`w-full hover:scale-[1.02] transition-transform ${
                      plan.highlight ? "glow-button" : ""
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </SignInButton>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

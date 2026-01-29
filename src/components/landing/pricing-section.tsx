"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For solo builders",
    price: "$15",
    period: "/mo",
    features: ["Template matching", "GitHub repo generation", "AI scaffolding files"],
    featured: false,
  },
  {
    name: "Pro",
    description: "For serious builders",
    price: "$30",
    period: "/mo",
    features: ["Everything in Starter", "Custom template requests", "Priority support"],
    featured: true,
    badge: "Popular",
  },
  {
    name: "Enterprise",
    description: "For teams",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Dedicated support",
      "Custom integrations",
    ],
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-secondary/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            Pricing
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight">
            Simple pricing, no surprises
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 flex flex-col relative ${
                plan.featured
                  ? "bg-foreground text-background ring-1 ring-foreground"
                  : "bg-white border border-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute top-4 right-4 text-[0.6875rem] font-medium px-2.5 py-1 rounded-full bg-background text-foreground">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-0.5">{plan.name}</h3>
                <p className={`text-sm ${plan.featured ? "text-background/60" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-0.5 mb-8">
                <span className="text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={`text-sm ${plan.featured ? "text-background/60" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-2.5 text-sm ${
                      plan.featured ? "text-background/80" : "text-muted-foreground"
                    }`}
                  >
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        plan.featured ? "text-emerald-400" : "text-emerald-600"
                      }`}
                      strokeWidth={2.5}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <SignInButton mode="modal">
                <Button
                  className={`w-full rounded-lg font-medium ${
                    plan.featured
                      ? "bg-background text-foreground hover:bg-background/90"
                      : ""
                  }`}
                  variant={plan.featured ? "secondary" : "default"}
                >
                  Get started
                </Button>
              </SignInButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

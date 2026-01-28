"use client";

import { motion } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For solo builders",
    price: "$15",
    period: "/month",
    features: ["Template matching", "GitHub repo generation", "AI scaffolding files"],
    cta: "Start building",
    ctaVariant: "default" as const,
    featured: false,
  },
  {
    name: "Pro",
    description: "For serious builders",
    price: "$30",
    period: "/month",
    features: ["Everything in Starter", "Custom template requests", "Priority support"],
    cta: "Start building",
    ctaVariant: "default" as const,
    featured: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    description: "For teams",
    price: "Custom",
    period: "",
    features: ["Everything in Pro", "Team collaboration", "Dedicated support", "Custom integrations"],
    cta: "Contact us",
    ctaVariant: "secondary" as const,
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20">
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
            Simple pricing. No surprises.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start building today. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-[960px] mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`bg-card border rounded-2xl p-8 flex flex-col transition-all duration-300 relative ${
                plan.featured
                  ? "border-primary shadow-[0_8px_32px_rgba(0,102,255,0.12)]"
                  : "border-border hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="text-lg font-semibold mb-1">{plan.name}</div>
                <div className="text-sm text-muted-foreground">{plan.description}</div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[0.9375rem] text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <SignInButton mode="modal">
                <Button
                  className={`w-full rounded-full font-semibold ${
                    plan.featured ? "glow-button" : ""
                  }`}
                  variant={plan.ctaVariant}
                >
                  {plan.cta}
                </Button>
              </SignInButton>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

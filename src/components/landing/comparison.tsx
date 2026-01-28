"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonData = [
  {
    feature: "Output",
    shipright: "GitHub repo you own",
    competitors: "Hosted on their platform",
  },
  {
    feature: "Lock-in",
    shipright: "None — take it anywhere",
    competitors: "Stuck when you outgrow",
  },
  {
    feature: "AI optimization",
    shipright: "Vibe code ready",
    competitors: "Generic code",
  },
  {
    feature: "Templates",
    shipright: "Curated, best-in-class",
    competitors: "One-size-fits-all",
  },
  {
    feature: "Pricing",
    shipright: "$15-30/mo",
    competitors: "$50-200/mo",
  },
];

export function Comparison() {
  return (
    <section className="py-20">
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
            Unlike other AI builders, you own the code
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No walled gardens. No lock-in. Just your code in your repo.
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          className="bg-card border border-border rounded-2xl overflow-hidden max-w-[900px] mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Header */}
          <div className="grid grid-cols-3 bg-muted border-b border-border">
            <div className="p-5 font-semibold" />
            <div className="p-5 bg-accent flex items-center justify-center gap-2.5 font-semibold">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white text-xs font-bold">
                S
              </div>
              ShipRight
            </div>
            <div className="p-5 text-center text-muted-foreground font-medium">
              Lovable / Bolt / Base44
            </div>
          </div>

          {/* Rows */}
          {comparisonData.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-3 border-b border-border last:border-b-0"
            >
              <div className="p-4 px-6 font-medium">{row.feature}</div>
              <div className="p-4 bg-primary/[0.03] flex items-center justify-center gap-2.5">
                <Check className="w-[18px] h-[18px] text-green-600" strokeWidth={2.5} />
                <span className="text-sm">{row.shipright}</span>
              </div>
              <div className="p-4 flex items-center justify-center gap-2.5 text-muted-foreground">
                <X className="w-[18px] h-[18px] opacity-40" />
                <span className="text-sm">{row.competitors}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

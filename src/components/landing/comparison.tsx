"use client";

import { Check, X } from "lucide-react";

const rows = [
  {
    feature: "Output",
    us: "GitHub repo you own",
    them: "Hosted on their platform",
  },
  {
    feature: "Lock-in",
    us: "None -- take it anywhere",
    them: "Stuck when you outgrow",
  },
  {
    feature: "AI optimization",
    us: "Scaffolding for vibe coding",
    them: "Generic boilerplate",
  },
  {
    feature: "Templates",
    us: "Curated, best-in-class",
    them: "One-size-fits-all",
  },
  {
    feature: "Pricing",
    us: "$15 - 30/mo",
    them: "$50 - 200/mo",
  },
];

export function Comparison() {
  return (
    <section id="compare" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            Why ShipRight
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight">
            You own the code. No walled gardens.
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl mx-auto text-left">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="pb-4 pr-8 text-sm font-medium text-muted-foreground w-1/4" />
                <th className="pb-4 pr-8 text-sm font-semibold w-[37.5%]">
                  ShipRight
                </th>
                <th className="pb-4 text-sm font-medium text-muted-foreground w-[37.5%]">
                  Lovable / Bolt / Base44
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-border">
                  <td className="py-4 pr-8 text-sm font-medium">
                    {row.feature}
                  </td>
                  <td className="py-4 pr-8">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                      {row.us}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="w-4 h-4 opacity-30 flex-shrink-0" />
                      {row.them}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

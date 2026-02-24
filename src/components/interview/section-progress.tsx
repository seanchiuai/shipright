"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  Users,
  Route,
  Database,
  DollarSign,
  Palette,
  Target,
} from "lucide-react";

const SECTIONS = [
  { key: "vision", label: "Vision", icon: Lightbulb },
  { key: "users", label: "Users", icon: Users },
  { key: "workflows", label: "Workflows", icon: Route },
  { key: "content", label: "Content", icon: Database },
  { key: "monetization", label: "Revenue", icon: DollarSign },
  { key: "design", label: "Design", icon: Palette },
  { key: "scope", label: "Scope", icon: Target },
] as const;

type SectionStatus = "complete" | "partial" | "not_started";

export function SectionProgress({
  currentSection,
  sectionProgress,
}: {
  currentSection?: string | null;
  sectionProgress?: Record<string, SectionStatus> | null;
}) {
  if (!sectionProgress) return null;

  return (
    <div className="w-full border-b border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-6 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          {SECTIONS.map((section, i) => {
            const status = sectionProgress[section.key] || "not_started";
            const isCurrent = currentSection === section.key;
            const Icon = section.icon;

            return (
              <div key={section.key} className="flex items-center flex-1 min-w-0">
                <motion.div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 min-w-0",
                    isCurrent && "bg-primary/10",
                  )}
                  animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                      status === "complete"
                        ? "bg-green-500/20 text-green-400"
                        : isCurrent
                          ? "bg-primary/20 text-primary"
                          : status === "partial"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-muted text-muted-foreground/40",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-wide hidden sm:block truncate",
                      status === "complete"
                        ? "text-green-400"
                        : isCurrent
                          ? "text-foreground"
                          : status === "partial"
                            ? "text-amber-400/80"
                            : "text-muted-foreground/40",
                    )}
                  >
                    {section.label}
                  </span>
                </motion.div>

                {/* Connector line */}
                {i < SECTIONS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-0.5 transition-colors duration-300",
                      status === "complete"
                        ? "bg-green-500/30"
                        : "bg-border/30",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

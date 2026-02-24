"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Users,
  Layers,
  Route,
  Database,
  Cpu,
  DollarSign,
  Target,
  LayoutGrid,
  Palette,
} from "lucide-react";

export const BLUEPRINT_SECTIONS = [
  { key: "executiveSummary", label: "Executive Summary", icon: FileText },
  { key: "userPersonas", label: "User Personas", icon: Users },
  { key: "featureBreakdown", label: "Features", icon: Layers },
  { key: "userFlows", label: "User Flows", icon: Route },
  { key: "dataModel", label: "Data Model", icon: Database },
  { key: "techStackRecommendations", label: "Tech Stack", icon: Cpu },
  { key: "monetizationStrategy", label: "Monetization", icon: DollarSign },
  { key: "mvpScope", label: "MVP Scope", icon: Target },
  { key: "architectureOverview", label: "Architecture", icon: LayoutGrid },
  { key: "designDirection", label: "Design Direction", icon: Palette },
] as const;

export type BlueprintSectionKey = (typeof BLUEPRINT_SECTIONS)[number]["key"];

export function BlueprintNav({
  activeSection,
  onSelect,
  availableSections,
}: {
  activeSection: BlueprintSectionKey;
  onSelect: (key: BlueprintSectionKey) => void;
  availableSections: Set<string>;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          {BLUEPRINT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            const hasContent = availableSections.has(section.key);

            return (
              <button
                key={section.key}
                onClick={() => onSelect(section.key)}
                disabled={!hasContent}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : hasContent
                      ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      : "text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal tabs */}
      <div className="lg:hidden overflow-x-auto border-b border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {BLUEPRINT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            const hasContent = availableSections.has(section.key);

            return (
              <button
                key={section.key}
                onClick={() => onSelect(section.key)}
                disabled={!hasContent}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : hasContent
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

"use client";

import { motion } from "framer-motion";
import { Requirements } from "@/lib/types";
import {
  Lightbulb,
  Users,
  Route,
  Layers,
  DollarSign,
  Palette,
  Target,
  Sparkles,
} from "lucide-react";

export function BlueprintPreview({
  requirements,
  loading,
  onGenerate,
  onContinueConversation,
}: {
  requirements: Requirements;
  loading: boolean;
  onGenerate: () => void;
  onContinueConversation: () => void;
}) {
  const featureNames = requirements.keyFeatures.map((f) =>
    typeof f === "string" ? f : f.name,
  );
  const mustHaveFeatures = requirements.keyFeatures.filter(
    (f) => typeof f !== "string" && f.priority === "must-have",
  );
  const niceToHaveFeatures = requirements.keyFeatures.filter(
    (f) => typeof f !== "string" && f.priority === "nice-to-have",
  );

  const sections = [
    {
      icon: Lightbulb,
      label: "Vision",
      content: requirements.problemStatement,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Users,
      label: "Users",
      content: [
        requirements.primaryUser.type,
        ...requirements.secondaryUsers.map((u) => u.type),
      ].join(", "),
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Route,
      label: "Core Action",
      content: requirements.coreAction,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      icon: Layers,
      label: "Features",
      content:
        mustHaveFeatures.length > 0
          ? `${mustHaveFeatures.length} must-have, ${niceToHaveFeatures.length} nice-to-have`
          : `${featureNames.length} features identified`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    ...(requirements.monetization && requirements.monetization.type !== "free"
      ? [
          {
            icon: DollarSign,
            label: "Revenue",
            content: requirements.monetization.description,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
        ]
      : []),
    ...(requirements.designPreferences
      ? [
          {
            icon: Palette,
            label: "Design",
            content: requirements.designPreferences.style,
            color: "text-pink-400",
            bg: "bg-pink-500/10",
          },
        ]
      : []),
    ...(requirements.constraints.mvpScope
      ? [
          {
            icon: Target,
            label: "MVP Scope",
            content: requirements.constraints.mvpScope,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
        ]
      : []),
  ];

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-8 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="pb-6 mb-6 border-b border-border/50">
        <h3 className="font-serif text-2xl tracking-tight text-foreground">
          {requirements.appName}
        </h3>
        <p className="text-[15px] text-muted-foreground mt-1.5 leading-relaxed italic">
          {requirements.tagline}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-muted text-muted-foreground tracking-wide">
            {requirements.appType}
          </span>
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-muted text-muted-foreground tracking-wide">
            {requirements.platform}
          </span>
        </div>
      </div>

      {/* Section previews */}
      <div className="space-y-3 mb-8">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.label}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${section.bg}`}
              >
                <Icon className={`w-4 h-4 ${section.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                  {section.label}
                </p>
                <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-2">
                  {section.content}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Workflows preview */}
      {requirements.workflows && requirements.workflows.length > 0 && (
        <div className="pb-6 mb-6 border-t border-border/50 pt-6">
          <p className="text-[12px] font-medium text-muted-foreground mb-3">
            Key Workflows
          </p>
          <div className="flex flex-wrap gap-1.5">
            {requirements.workflows.map((w) => (
              <span
                key={w.name}
                className="px-2.5 py-1 text-[12px] rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium"
              >
                {w.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 space-y-3">
        <button
          onClick={onGenerate}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground text-[14px] font-medium rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            "Generating..."
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Blueprint
            </>
          )}
        </button>
        <div className="text-center">
          <button
            onClick={onContinueConversation}
            disabled={loading}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Keep Refining
          </button>
        </div>
      </div>
    </motion.div>
  );
}

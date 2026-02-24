"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { BlueprintSectionKey } from "./blueprint-nav";
import { BLUEPRINT_SECTIONS } from "./blueprint-nav";

export function BlueprintSectionRenderer({
  sectionKey,
  content,
}: {
  sectionKey: BlueprintSectionKey;
  content: string;
}) {
  const section = BLUEPRINT_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return null;

  const Icon = section.icon;

  return (
    <motion.div
      key={sectionKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{section.label}</h2>
      </div>

      <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-a:text-primary">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </motion.div>
  );
}

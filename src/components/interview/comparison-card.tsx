"use client";

import { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ComparisonCardProps {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  delay?: number;
}

export const ComparisonCard = memo(function ComparisonCard({
  label,
  description,
  selected,
  onClick,
  delay = 0,
}: ComparisonCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-5 py-4 rounded-xl border transition-all duration-200",
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
          : "border-border bg-card/80 hover:border-primary/40 hover:bg-card hover:shadow-sm",
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground/40 group-hover:border-muted-foreground/60",
          )}
        >
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[14px] font-medium tracking-[-0.01em] transition-colors",
              selected ? "text-foreground" : "text-foreground/80",
            )}
          >
            {label}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
});

interface ComparisonGridProps {
  options: string[];
  descriptions: string[];
  selected: string;
  onChange: (value: string) => void;
}

export const ComparisonGrid = memo(function ComparisonGrid({
  options,
  descriptions,
  selected,
  onChange,
}: ComparisonGridProps) {
  const selectedValue = useMemo(() => selected || "", [selected]);

  const createClickHandler = useCallback(
    (option: string) => () => {
      onChange(option);
    },
    [onChange],
  );

  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((option, index) => (
        <ComparisonCard
          key={option}
          label={option}
          description={descriptions[index] || ""}
          selected={selectedValue === option}
          onClick={createClickHandler(option)}
          delay={index * 0.06}
        />
      ))}
    </div>
  );
});

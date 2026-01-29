"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ChoiceCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  description?: string;
  multiSelect?: boolean;
  delay?: number;
}

export function ChoiceCard({
  label,
  selected,
  onClick,
  icon,
  description,
  multiSelect = false,
  delay = 0,
}: ChoiceCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-4 py-3 rounded-xl border transition-all duration-200",
        selected
          ? "border-foreground bg-foreground/[0.03]"
          : "border-border/60 bg-white/60 hover:border-foreground/30 hover:bg-white"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.21, 0.47, 0.32, 0.98],
        delay,
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator */}
        <div
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200",
            selected
              ? "border-foreground bg-foreground"
              : "border-border group-hover:border-foreground/40"
          )}
        >
          {selected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
              <Check className="w-3 h-3 text-background" />
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {icon && (
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                selected ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {icon}
            </div>
          )}
          <p
            className={cn(
              "text-sm font-medium transition-colors",
              selected ? "text-foreground" : "text-foreground/80"
            )}
          >
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

interface ChoiceGridProps {
  options: string[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
}

export function ChoiceGrid({ options, selected, onChange, multiSelect = false }: ChoiceGridProps) {
  const selectedArray = Array.isArray(selected) ? selected : selected ? [selected] : [];

  const handleClick = (option: string) => {
    if (multiSelect) {
      const newSelected = selectedArray.includes(option)
        ? selectedArray.filter((s) => s !== option)
        : [...selectedArray, option];
      onChange(newSelected);
    } else {
      onChange(option);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((option, index) => (
        <ChoiceCard
          key={option}
          label={option}
          selected={selectedArray.includes(option)}
          onClick={() => handleClick(option)}
          multiSelect={multiSelect}
          delay={index * 0.04}
        />
      ))}
    </div>
  );
}

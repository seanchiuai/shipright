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
          ? "border-stone-800 bg-stone-800/[0.04] shadow-[0_0_0_1px_rgba(28,25,23,0.08)]"
          : "border-stone-200 bg-white/80 hover:border-stone-400 hover:bg-white hover:shadow-sm"
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay,
      }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator */}
        <div
          className={cn(
            "flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
            selected
              ? "border-stone-800 bg-stone-800"
              : "border-stone-300 group-hover:border-stone-400"
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          {icon && (
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 transition-colors",
                selected
                  ? "bg-stone-800/10 text-stone-800"
                  : "bg-stone-100 text-stone-400"
              )}
            >
              {icon}
            </div>
          )}
          <p
            className={cn(
              "text-[14px] font-medium tracking-[-0.01em] transition-colors",
              selected ? "text-stone-900" : "text-stone-700"
            )}
          >
            {label}
          </p>
          {description && (
            <p className="text-[12px] text-stone-400 mt-0.5 leading-snug">
              {description}
            </p>
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

export function ChoiceGrid({
  options,
  selected,
  onChange,
  multiSelect = false,
}: ChoiceGridProps) {
  const selectedArray = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];

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

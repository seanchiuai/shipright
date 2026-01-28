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
        "group relative w-full text-left p-4 rounded-xl border-2 transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/50 bg-white hover:border-primary/30"
      )}
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay,
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          selected
            ? "border-primary bg-primary"
            : "border-border/50 group-hover:border-primary/50"
        )}
      >
        {selected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
            <Check className="w-3.5 h-3.5 text-white" />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="pr-8">
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors",
              selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            {icon}
          </div>
        )}
        <p
          className={cn(
            "font-medium transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {label}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Hover glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 transition-opacity pointer-events-none",
          "bg-gradient-to-br from-primary/5 to-transparent",
          selected ? "opacity-100" : "group-hover:opacity-50"
        )}
      />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((option, index) => (
        <ChoiceCard
          key={option}
          label={option}
          selected={selectedArray.includes(option)}
          onClick={() => handleClick(option)}
          multiSelect={multiSelect}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}

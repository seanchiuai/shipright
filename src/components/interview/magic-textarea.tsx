"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";

interface MagicTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  loading?: boolean;
  submitLabel?: string;
  minRows?: number;
  maxRows?: number;
}

export function MagicTextarea({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your answer...",
  maxLength,
  disabled = false,
  loading = false,
  submitLabel = "Send",
  minRows = 2,
  maxRows = 5,
}: MagicTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = 24;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minRows, maxRows]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !loading) {
        onSubmit();
      }
    }
  };

  const canSubmit = value.trim() && !disabled && !loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={cn(
          "relative bg-white border border-border rounded-xl overflow-hidden transition-all duration-300",
          isFocused && "border-foreground/30 shadow-[0_0_0_3px_rgba(28,25,23,0.06)]"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || loading}
          className={cn(
            "w-full bg-transparent px-4 pt-3 pb-2 pr-16 resize-none",
            "text-[15px] leading-6 placeholder:text-muted-foreground/50",
            "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={minRows}
        />

        {/* Submit button */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {maxLength && (
            <span
              className={cn(
                "text-xs transition-colors",
                value.length > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground/40"
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              canSubmit
                ? "bg-foreground text-background hover:opacity-80"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span className="text-xs text-muted-foreground/40">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send
        </span>
      </div>
    </motion.div>
  );
}

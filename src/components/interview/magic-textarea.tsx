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
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight
    );
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className={cn(
          "relative bg-white rounded-2xl border overflow-hidden transition-all duration-300",
          isFocused
            ? "border-stone-300 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            : "border-stone-200 shadow-sm"
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
            "w-full bg-transparent px-5 pt-4 pb-3 pr-16 resize-none",
            "text-[15px] leading-6 text-stone-800 placeholder:text-stone-400/70",
            "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            "tracking-[-0.01em]"
          )}
          rows={minRows}
        />

        {/* Submit button */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {maxLength && (
            <span
              className={cn(
                "text-[11px] tabular-nums transition-colors",
                value.length > maxLength * 0.9
                  ? "text-red-500"
                  : "text-stone-300"
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
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              canSubmit
                ? "bg-stone-800 text-white hover:bg-stone-700 shadow-sm"
                : "bg-stone-100 text-stone-300 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-stone-400/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span className="text-[11px] text-stone-400/60 tracking-wide">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono text-stone-400 border border-stone-200/50">
            Enter
          </kbd>{" "}
          to send
        </span>
      </div>
    </motion.div>
  );
}

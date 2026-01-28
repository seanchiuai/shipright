"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Send, Sparkles } from "lucide-react";

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
      className={cn(
        "relative rounded-2xl transition-all duration-300",
        isFocused && "shadow-lg shadow-primary/10"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Animated border gradient */}
      <div
        className={cn(
          "absolute -inset-[1px] rounded-2xl transition-opacity duration-300",
          "bg-gradient-to-r from-primary via-primary/50 to-primary",
          isFocused ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Inner container */}
      <div className="relative bg-white rounded-2xl border border-border/50 overflow-hidden">
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
            "w-full px-4 py-3 pr-24 bg-transparent resize-none",
            "text-[15px] leading-6 placeholder:text-muted-foreground/60",
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
                value.length > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground/50"
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}

          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
              canSubmit
                ? "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>{submitLabel}</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="flex justify-end mt-2">
        <span className="text-xs text-muted-foreground/50">
          Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">Enter</kbd> to send
        </span>
      </div>
    </motion.div>
  );
}

"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { User } from "lucide-react";

export interface AIMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "assistant" | "user";
  children: React.ReactNode;
}

const AIMessage = forwardRef<HTMLDivElement, AIMessageProps>(
  ({ role, children, className, ...props }, ref) => {
    const isAssistant = role === "assistant";

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 max-w-[85%]",
          isAssistant ? "self-start" : "self-end flex-row-reverse",
          className
        )}
        {...props}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
            isAssistant
              ? "bg-white border border-border/50 shadow-sm"
              : "bg-gradient-to-br from-secondary to-secondary/70 text-foreground"
          )}
        >
          {isAssistant ? (
            <Image src="/logo.png" alt="ShipRight" width={32} height={32} className="w-[90%] h-[90%] object-contain" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl",
            isAssistant
              ? "bg-white border border-border/50 shadow-sm rounded-tl-sm"
              : "bg-primary text-primary-foreground rounded-tr-sm"
          )}
        >
          {/* Glow effect for AI messages */}
          {isAssistant && (
            <div className="absolute -inset-px rounded-2xl rounded-tl-sm bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          )}

          <div className="relative">{children}</div>
        </div>
      </div>
    );
  }
);

AIMessage.displayName = "AIMessage";

export { AIMessage };

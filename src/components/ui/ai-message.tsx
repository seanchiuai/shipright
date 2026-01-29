"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface AIMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "assistant" | "user";
  userImageUrl?: string;
  children: React.ReactNode;
}

const AIMessage = forwardRef<HTMLDivElement, AIMessageProps>(
  ({ role, userImageUrl, children, className, ...props }, ref) => {
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
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isAssistant
              ? "bg-white border border-border/50 shadow-sm"
              : "bg-foreground/[0.07]"
          )}
        >
          {isAssistant ? (
            <Image src="/logo.png" alt="ShipRight" width={24} height={24} className="w-5 h-5 object-contain" />
          ) : userImageUrl ? (
            <Image src={userImageUrl} alt="You" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">You</span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl",
            isAssistant
              ? "bg-white/80 backdrop-blur-sm border border-border/40 rounded-tl-sm"
              : "bg-foreground text-background rounded-tr-sm"
          )}
        >
          <div className="relative">{children}</div>
        </div>
      </div>
    );
  }
);

AIMessage.displayName = "AIMessage";

export { AIMessage };

"use client";

import { forwardRef, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface AIConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  autoScroll?: boolean;
  children: React.ReactNode;
}

const AIConversation = forwardRef<HTMLDivElement, AIConversationProps>(
  ({ autoScroll = true, children, className, ...props }, ref) => {
    const endRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
      if (autoScroll && endRef.current) {
        endRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [autoScroll]);

    useEffect(() => {
      scrollToBottom();
    }, [children, scrollToBottom]);

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-8 overflow-y-auto", className)}
        {...props}
      >
        {children}
        <div ref={endRef} aria-hidden="true" />
      </div>
    );
  }
);

AIConversation.displayName = "AIConversation";

export { AIConversation };

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
          "group relative",
          isAssistant ? "self-start w-full" : "self-end max-w-[80%]",
          className
        )}
        {...props}
      >
        {isAssistant ? (
          /* AI: editorial flowing text — no bubble, just clean typography */
          <div className="flex gap-4">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center shadow-sm">
                <Image
                  src="/logo.png"
                  alt="ShipRight"
                  width={20}
                  height={20}
                  className="w-4 h-4 object-contain brightness-0 invert"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="relative text-[15px] leading-[1.7] text-stone-800 font-normal tracking-[-0.01em]">
                {children}
              </div>
            </div>
          </div>
        ) : (
          /* User: refined pill with warm tone */
          <div className="flex justify-end">
            <div className="flex items-end gap-2.5">
              <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-stone-800 text-stone-50 shadow-sm">
                <div className="text-[15px] leading-[1.6] tracking-[-0.01em]">
                  {children}
                </div>
              </div>
              {userImageUrl ? (
                <div className="flex-shrink-0">
                  <Image
                    src={userImageUrl}
                    alt="You"
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-200"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
                    You
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AIMessage.displayName = "AIMessage";

export { AIMessage };

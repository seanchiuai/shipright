"use client";

import { motion } from "framer-motion";
import { AIMessage } from "@/components/ui/ai-message";
import { TypewriterText } from "./typewriter-text";

interface ChatMessageProps {
  message: string;
  isAI?: boolean;
  animate?: boolean;
  typewriter?: boolean;
  onTypewriterComplete?: () => void;
  delay?: number;
  userImageUrl?: string;
  children?: React.ReactNode;
}

export function ChatMessage({
  message,
  isAI = false,
  animate = true,
  typewriter = false,
  onTypewriterComplete,
  delay = 0,
  userImageUrl,
  children,
}: ChatMessageProps) {
  const content = (
    <AIMessage role={isAI ? "assistant" : "user"} userImageUrl={userImageUrl}>
      {typewriter ? (
        <TypewriterText
          text={message}
          onComplete={onTypewriterComplete}
          className="font-normal"
        />
      ) : (
        <p className="font-normal">{message}</p>
      )}
      {children}
    </AIMessage>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay,
      }}
      className={isAI ? "self-start w-full" : "self-end max-w-[80%]"}
    >
      {content}
    </motion.div>
  );
}

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
  children?: React.ReactNode;
}

export function ChatMessage({
  message,
  isAI = false,
  animate = true,
  typewriter = false,
  onTypewriterComplete,
  delay = 0,
  children,
}: ChatMessageProps) {
  const bubbleVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
        delay,
      },
    },
  };

  const content = (
    <AIMessage role={isAI ? "assistant" : "user"}>
      {typewriter ? (
        <TypewriterText
          text={message}
          onComplete={onTypewriterComplete}
          className="text-[15px] leading-relaxed"
        />
      ) : (
        <p className="text-[15px] leading-relaxed">{message}</p>
      )}
      {children}
    </AIMessage>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className="contents"
    >
      {content}
    </motion.div>
  );
}

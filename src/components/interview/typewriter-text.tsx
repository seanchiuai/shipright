"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  cursor?: boolean;
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  className = "",
  cursor = true,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {cursor && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[2px] h-[18px] bg-stone-800 ml-0.5 align-middle rounded-full"
        />
      )}
    </span>
  );
}

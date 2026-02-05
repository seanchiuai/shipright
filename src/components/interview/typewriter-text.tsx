"use client";

import { useState, useEffect, useRef } from "react";
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
  const [charIndex, setCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const displayText = text.slice(0, charIndex);

  useEffect(() => {
    setCharIndex(0);
    setIsComplete(false);
    let index = 0;
    let lastTime = 0;
    let rafId: number;
    let cancelled = false;

    function animate(timestamp: number) {
      if (cancelled) return;

      if (timestamp - lastTime >= speed) {
        lastTime = timestamp;
        if (index < text.length) {
          index++;
          setCharIndex(index);
        } else {
          setIsComplete(true);
          onCompleteRef.current?.();
          return;
        }
      }
      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [text, speed]);

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

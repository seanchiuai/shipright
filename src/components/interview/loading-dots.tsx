"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LoadingDots() {
  return (
    <motion.div
      className="flex gap-4 items-start self-start"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm">
        <Image src="/logo.png" alt="ShipRight" width={20} height={20} className="w-4 h-4 object-contain brightness-0 invert" />
      </div>
      <div className="flex gap-1.5 items-center pt-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.85, 1, 0.85] }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

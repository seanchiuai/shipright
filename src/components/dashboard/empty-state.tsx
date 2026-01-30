"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
        <Zap className="w-10 h-10 text-primary" />
      </div>
      <h3 className="font-serif text-2xl font-medium text-foreground mb-3">
        Ready to build something?
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Type your app idea above and we&apos;ll help you turn it into a GitHub
        repo in minutes.
      </p>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="text-center py-16"
    >
      <h3 className="font-serif text-2xl font-medium text-foreground mb-3">
        No projects yet
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Type your app idea above to get started.
      </p>
    </motion.div>
  );
}

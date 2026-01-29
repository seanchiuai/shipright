"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

export function DemoSection() {
  return (
    <section className="py-10 md:py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        <motion.div
          className="max-w-[800px] mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="aspect-video bg-gradient-to-br from-muted to-secondary rounded-2xl border border-border flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:border-primary hover:shadow-[0_8px_32px_rgba(240,140,58,0.15)] group relative overflow-hidden">
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(240,140,58,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Play button */}
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(240,140,58,0.3)] group-hover:scale-110 group-hover:shadow-[0_8px_32px_rgba(240,140,58,0.3)]">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>

            {/* Label */}
            <p className="font-medium text-muted-foreground">
              See how it works in 2 minutes
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

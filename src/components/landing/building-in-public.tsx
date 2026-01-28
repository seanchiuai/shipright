"use client";

import { motion } from "framer-motion";

export function BuildingInPublic() {
  return (
    <section className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="container">
          <motion.div
            className="follow-card bg-card border border-border rounded-2xl p-8 text-center transition-all duration-300 hover:border-primary hover:shadow-[0_8px_32px_rgba(0,102,255,0.1)] hover:-translate-y-1"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              BUILDING IN PUBLIC
            </div>
            <p className="text-lg text-foreground">
              Follow the journey{" "}
              <a
                href="https://x.com/seanchiuai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                @seanchiuai
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

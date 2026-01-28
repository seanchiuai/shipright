"use client";

import { motion } from "framer-motion";
import { Linkedin, Instagram } from "lucide-react";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M18.901 1.153h3.68l-8.041 9.19 9.46 12.504h-7.406l-5.8-7.584-6.64 7.584H.476l8.602-9.83L0 1.153h7.594l5.243 6.932 6.064-6.932zm-1.29 19.493h2.04L6.486 3.24H4.298l13.313 17.406z"
      />
    </svg>
  );
}

export function BuildingInPublic() {
  return (
    <section className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="container">
          <motion.div
            className="follow-card bg-card border border-border rounded-[28px] p-8 sm:p-10 text-center transition-all duration-300 relative overflow-hidden hover:border-primary hover:shadow-[0_20px_60px_rgba(0,102,255,0.12)] hover:-translate-y-1"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Subtle glow */}
            <div
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-70"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(0, 102, 255, 0.10) 0%, transparent 55%)",
                animation: "rotateGlow 22s linear infinite",
              }}
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/70 text-primary rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider mb-5">
                Building in public
              </div>

              <p className="font-serif text-2xl sm:text-3xl font-normal text-foreground mb-2">
                Follow the journey
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mb-7">
                Updates, lessons, and shipping wins from{" "}
                <span className="font-medium text-foreground">@seanchiuai</span>
              </p>

              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <a
                  href="https://x.com/seanchiuai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on X"
                  className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur-sm hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  <XIcon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                </a>
                <a
                  href="https://www.linkedin.com/in/seanchiuai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Connect on LinkedIn"
                  className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur-sm hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  <Linkedin className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                </a>
                <a
                  href="https://www.instagram.com/seanchiuai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on Instagram"
                  className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur-sm hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  <Instagram className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

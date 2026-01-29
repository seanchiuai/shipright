"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "1+", label: "Repos generated" },
  { value: "1+", label: "Founders building" },
  { value: "5 min", label: "Setup time" },
];

export function SocialProof() {
  return (
    <section className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        <motion.div
          className="bg-muted rounded-[32px] p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Rotating glow effect */}
          <div
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(240, 140, 58, 0.05) 0%, transparent 50%)",
              animation: "rotateGlow 20s linear infinite",
            }}
          />

          {/* Section header */}
          <div className="relative z-10 mb-12">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal mb-4">
              Join founders building with ShipRight
            </h2>
          </div>

          {/* Testimonial */}
          <motion.div
            className="relative z-10 max-w-md mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-card border border-border rounded-2xl p-7 text-center transition-all hover:border-primary hover:shadow-[0_10px_30px_rgba(240,140,58,0.1)] hover:-translate-y-0.5">
              <p className="text-lg leading-relaxed mb-4">
                &ldquo;ShipRight got me from idea to code in minutes. No more decision paralysis about tech stacks or project structure.&rdquo;
              </p>
              <p className="text-sm text-muted-foreground">— Early User</p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-16">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <div className="font-serif text-4xl md:text-5xl text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

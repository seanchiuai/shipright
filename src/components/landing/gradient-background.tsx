"use client";

import { ReactNode, useEffect, useState } from "react";

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function GradientBackground({
  children,
  className = "",
}: GradientBackgroundProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const blurSize = isMobile ? "blur-2xl" : "blur-3xl";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Base gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.11 0.02 260), oklch(0.08 0.02 260))",
        }}
      />

      {/* Top-right blue orb */}
      <div
        className={`fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none ${blurSize}`}
        style={{
          background:
            "radial-gradient(circle, oklch(0.35 0.2 250 / 0.4) 0%, transparent 70%)",
        }}
      />

      {/* Bottom-left cyan orb */}
      <div
        className={`fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none ${blurSize}`}
        style={{
          background:
            "radial-gradient(circle, oklch(0.35 0.15 200 / 0.3) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(oklch(0.3 0 0 / 0.02) 1px, transparent 1px),
                           linear-gradient(90deg, oklch(0.3 0 0 / 0.02) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

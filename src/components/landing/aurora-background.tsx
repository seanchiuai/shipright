"use client";

import { useEffect, useRef } from "react";

/**
 * Full-page aurora background with mouse-reactive gradient.
 * Uses CSS custom properties for the cursor position so the
 * radial-gradient spotlight follows the mouse smoothly.
 */
export function AuroraBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.3 });
  const currentRef = useRef({ x: 0.5, y: 0.3 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    const animate = () => {
      // Smooth lerp toward mouse position
      const lerp = 0.06;
      currentRef.current.x += (mouseRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y += (mouseRef.current.y - currentRef.current.y) * lerp;

      el.style.setProperty("--mouse-x", `${(currentRef.current.x * 100).toFixed(1)}%`);
      el.style.setProperty("--mouse-y", `${(currentRef.current.y * 100).toFixed(1)}%`);

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "30%",
        } as React.CSSProperties
      }
    >
      {/* Mouse-following spotlight — the main interactive gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.12) 50%, transparent 80%)",
        }}
      />

      {/* Ambient drifting blobs */}
      <div
        className="absolute w-[800px] h-[600px] rounded-full aurora-blob-1"
        style={{
          top: "-10%",
          left: "30%",
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.03) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute w-[600px] h-[700px] rounded-full aurora-blob-2"
        style={{
          top: "20%",
          right: "-5%",
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.02) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute w-[700px] h-[500px] rounded-full aurora-blob-3"
        style={{
          bottom: "5%",
          left: "-10%",
          background:
            "radial-gradient(circle at center, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Noise grain */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}

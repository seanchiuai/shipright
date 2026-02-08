"use client";

import { useEffect, useRef } from "react";

export function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }> = [];
    let animationId: number;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      if (!canvas) return null;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 40 + 210,
      };
    }

    function initParticles() {
      if (!canvas) return;
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle();
        if (particle) particles.push(particle);
      }
    }

    function drawParticles() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
        ctx.fill();

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(220, 70%, 60%, ${0.12 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(drawParticles);
    }

    resizeCanvas();
    initParticles();
    drawParticles();

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Gradient background */}
      <div
        className="fixed inset-0 -z-30"
        style={{
          background:
            "linear-gradient(135deg, #06080d 0%, #0a0f1a 50%, #0d1117 100%)",
        }}
      />

      {/* Animated grid */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "gridMove 20s linear infinite",
        }}
      />

      {/* Gradient orbs */}
      <div
        className="fixed -z-10 rounded-full opacity-40"
        style={{
          top: "-10%",
          right: "10%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "float1 8s ease-in-out infinite",
        }}
      />
      <div
        className="fixed -z-10 rounded-full opacity-40"
        style={{
          bottom: "20%",
          left: "-5%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "float2 10s ease-in-out infinite",
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none"
      />
    </>
  );
}

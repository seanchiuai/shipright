"use client";

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

// Kept as a simple wrapper for backward compatibility if referenced elsewhere
export function GradientBackground({
  children,
  className = "",
}: GradientBackgroundProps) {
  return <div className={className}>{children}</div>;
}

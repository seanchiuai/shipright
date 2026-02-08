import { cn } from "@/lib/utils";

export function LoadingSpinner({
  variant = "spinner",
  className,
  size = "md",
}: {
  variant?: "spinner" | "dots";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-12 h-12",
  };

  if (variant === "dots") {
    const dotSize = size === "sm" ? "w-1 h-1" : size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5";
    return (
      <div className={cn("flex gap-1.5 items-center", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(dotSize, "rounded-full bg-muted-foreground animate-pulse")}
            style={{
              animationDelay: `${i * 200}ms`,
              animationDuration: "1.4s",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeMap[size],
        "border-2 border-border border-t-foreground rounded-full animate-spin",
        className
      )}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; glow: string }
  > = {
    interview: {
      label: "In Progress",
      color: "text-amber-600",
      bg: "bg-amber-50",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    },
    matching: {
      label: "Matching",
      color: "text-purple-600",
      bg: "bg-purple-50",
      glow: "shadow-[0_0_12px_rgba(139,92,246,0.2)]",
    },
    matched: {
      label: "Creating Repo",
      color: "text-blue-600",
      bg: "bg-blue-50",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]",
    },
    building: {
      label: "Building",
      color: "text-amber-600",
      bg: "bg-amber-50",
      glow: "shadow-[0_0_12px_rgba(240,140,58,0.2)]",
    },
    complete: {
      label: "Complete",
      color: "text-green-600",
      bg: "bg-green-50",
      glow: "shadow-[0_0_12px_rgba(34,197,94,0.2)]",
    },
  };

  const config = statusConfig[status] || statusConfig.interview;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg} ${config.glow}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-current"
        style={{ animation: "pulse 2s infinite" }}
      />
      {config.label}
    </span>
  );
}

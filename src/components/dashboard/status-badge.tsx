import { PROJECT_STATUS } from "@/lib/constants";

export function StatusBadge({ status, scaffoldingStatus }: { status: string; scaffoldingStatus?: string }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; glow: string }
  > = {
    [PROJECT_STATUS.INTERVIEW]: {
      label: "In Progress",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    [PROJECT_STATUS.MATCHING]: {
      label: "Matching",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      glow: "shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    },
    [PROJECT_STATUS.MATCHED]: {
      label: "Creating Repo",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    },
    [PROJECT_STATUS.BUILDING]: {
      label: "Building",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_12px_rgba(240,140,58,0.15)]",
    },
    [PROJECT_STATUS.SCAFFOLDING]: {
      label: "Scaffolding",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      glow: "shadow-[0_0_12px_rgba(99,102,241,0.15)]",
    },
    [PROJECT_STATUS.COMPLETE]: {
      label: "Complete",
      color: "text-green-400",
      bg: "bg-green-500/10",
      glow: "shadow-[0_0_12px_rgba(34,197,94,0.15)]",
    },
    [PROJECT_STATUS.REPO_FAILED]: {
      label: "Failed",
      color: "text-red-400",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
    },
  };

  const effectiveStatus = scaffoldingStatus === "scaffolding_failed" ? PROJECT_STATUS.REPO_FAILED : status;
  const config = statusConfig[effectiveStatus] || statusConfig[PROJECT_STATUS.INTERVIEW];

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

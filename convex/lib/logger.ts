export function formatLogEntry(params: {
  action: string;
  projectId: string;
  step: string;
  status: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown; // Allow additional metadata fields
}): string {
  let entry = `[SHIPRIGHT] action=${params.action} project=${params.projectId} step=${params.step} status=${params.status}`;
  if (params.durationMs !== undefined) {
    entry += ` duration=${params.durationMs}ms`;
  }
  if (params.error !== undefined) {
    entry += ` error=${params.error}`;
  }
  // Include any extra metadata
  for (const [key, value] of Object.entries(params)) {
    if (!["action", "projectId", "step", "status", "durationMs", "error"].includes(key) && value !== undefined) {
      entry += ` ${key}=${value}`;
    }
  }
  return entry;
}

export function formatLogEntry(params: {
  action: string;
  projectId: string;
  step: string;
  status: string;
  durationMs?: number;
  error?: string;
}): string {
  let entry = `[SHIPRIGHT] action=${params.action} project=${params.projectId} step=${params.step} status=${params.status}`;
  if (params.durationMs !== undefined) {
    entry += ` duration=${params.durationMs}ms`;
  }
  if (params.error !== undefined) {
    entry += ` error=${params.error}`;
  }
  return entry;
}

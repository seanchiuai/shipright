// Lightweight Sentry error reporting for Convex actions via HTTP envelope API.
// Convex runs in a custom runtime that can't use the Sentry Node SDK,
// so we build a minimal envelope and POST it.

export function buildSentryEnvelope(params: {
  message: string;
  dsn: string;
  context?: Record<string, unknown>;
}): string {
  if (!params.dsn) return "";

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = new Date().toISOString();

  const header = JSON.stringify({
    event_id: eventId,
    dsn: params.dsn,
    sent_at: timestamp,
  });

  const itemHeader = JSON.stringify({ type: "event" });

  const payload = JSON.stringify({
    event_id: eventId,
    timestamp,
    level: "error",
    message: params.message,
    ...(params.context && { extra: params.context }),
  });

  return `${header}\n${itemHeader}\n${payload}`;
}

function getSentryIngestUrl(dsn: string): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    return `https://${url.hostname}/api/${projectId}/envelope/`;
  } catch {
    return null;
  }
}

export async function reportToSentry(params: {
  message: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
  const envelope = buildSentryEnvelope({ ...params, dsn });
  if (!envelope) return;

  const ingestUrl = getSentryIngestUrl(dsn);
  if (!ingestUrl) return;

  try {
    await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch {
    // Best-effort — don't let Sentry reporting break the pipeline
  }
}

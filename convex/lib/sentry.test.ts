import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSentryEnvelope } from "./sentry";

describe("buildSentryEnvelope", () => {
  it("builds envelope with error message", () => {
    const envelope = buildSentryEnvelope({
      message: "Sandbox timeout",
      dsn: "https://abc@o123.ingest.sentry.io/456",
    });
    expect(envelope).toContain('"message":"Sandbox timeout"');
    expect(envelope).toContain('"level":"error"');
    expect(envelope).toContain('"dsn":"https://abc@o123.ingest.sentry.io/456"');
  });

  it("includes context when provided", () => {
    const envelope = buildSentryEnvelope({
      message: "PRD generation failed",
      dsn: "https://abc@o123.ingest.sentry.io/456",
      context: { projectId: "p123", step: "generating_prd" },
    });
    expect(envelope).toContain('"projectId":"p123"');
    expect(envelope).toContain('"step":"generating_prd"');
  });

  it("returns empty string when no DSN", () => {
    const envelope = buildSentryEnvelope({
      message: "some error",
      dsn: "",
    });
    expect(envelope).toBe("");
  });
});

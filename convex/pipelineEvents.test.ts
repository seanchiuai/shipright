import { describe, it, expect } from "vitest";
import { buildEventArgs } from "./pipelineEvents";

describe("buildEventArgs", () => {
  it("builds args with required fields only", () => {
    const args = buildEventArgs({
      projectId: "proj1" as never,
      step: "generating_prd",
      status: "started",
    });
    expect(args).toEqual({
      projectId: "proj1",
      step: "generating_prd",
      status: "started",
      timestamp: expect.any(Number),
    });
    expect(args.durationMs).toBeUndefined();
    expect(args.error).toBeUndefined();
    expect(args.metadata).toBeUndefined();
  });

  it("includes durationMs when provided", () => {
    const args = buildEventArgs({
      projectId: "proj1" as never,
      step: "generating_prd",
      status: "completed",
      durationMs: 1500,
    });
    expect(args.durationMs).toBe(1500);
  });

  it("includes error when provided", () => {
    const args = buildEventArgs({
      projectId: "proj1" as never,
      step: "generating_prd",
      status: "failed",
      error: "timeout",
    });
    expect(args.error).toBe("timeout");
  });

  it("includes metadata when provided", () => {
    const args = buildEventArgs({
      projectId: "proj1" as never,
      step: "running_sandbox",
      status: "started",
      metadata: { sandboxId: "sb-123" },
    });
    expect(args.metadata).toEqual({ sandboxId: "sb-123" });
  });

  it("uses current timestamp", () => {
    const before = Date.now();
    const args = buildEventArgs({
      projectId: "proj1" as never,
      step: "generating_prd",
      status: "started",
    });
    const after = Date.now();
    expect(args.timestamp).toBeGreaterThanOrEqual(before);
    expect(args.timestamp).toBeLessThanOrEqual(after);
  });
});

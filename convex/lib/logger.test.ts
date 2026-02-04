import { describe, it, expect } from "vitest";
import { formatLogEntry } from "./logger";

describe("formatLogEntry", () => {
  it("formats entry with all fields", () => {
    const result = formatLogEntry({
      action: "generatePrd",
      projectId: "abc123",
      step: "generating_prd",
      status: "completed",
      durationMs: 1234,
      error: "something broke",
    });
    expect(result).toBe(
      "[SHIPRIGHT] action=generatePrd project=abc123 step=generating_prd status=completed duration=1234ms error=something broke"
    );
  });

  it("omits duration when not provided", () => {
    const result = formatLogEntry({
      action: "matchTemplate",
      projectId: "xyz",
      step: "matching",
      status: "started",
    });
    expect(result).toBe(
      "[SHIPRIGHT] action=matchTemplate project=xyz step=matching status=started"
    );
    expect(result).not.toContain("duration");
  });

  it("omits error when not provided", () => {
    const result = formatLogEntry({
      action: "cloneTemplate",
      projectId: "p1",
      step: "cloning",
      status: "completed",
      durationMs: 500,
    });
    expect(result).not.toContain("error");
    expect(result).toContain("duration=500ms");
  });

  it("includes error without duration", () => {
    const result = formatLogEntry({
      action: "executeSandbox",
      projectId: "p2",
      step: "running_sandbox",
      status: "failed",
      error: "timeout",
    });
    expect(result).toContain("error=timeout");
    expect(result).not.toContain("duration");
  });
});

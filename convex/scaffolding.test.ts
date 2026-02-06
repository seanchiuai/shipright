import { describe, it, expect } from "vitest";
import { buildSandboxPrompt } from "./scaffolding";

// Tests for parseJsonResponse moved to convex/lib/json.test.ts

describe("buildSandboxPrompt", () => {
  const baseParams = {
    prdMarkdown: "# My PRD\nSome content",
    techStackResolved: [
      { need: "payments", library: "Stripe", package: "stripe", reason: "popular" },
    ],
    techStackChoices: null as Record<string, string> | null,
    requirements: { appName: "TestApp" },
    templateName: "SaaS Starter",
    templateStack: ["next.js", "convex", "clerk"],
    matchGaps: ["Payment processing"],
  };

  it("includes the PRD markdown", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("# My PRD");
    expect(prompt).toContain("Some content");
  });

  it("includes template name and stack", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("SaaS Starter");
    expect(prompt).toContain("next.js, convex, clerk");
  });

  it("includes resolved integrations", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("payments: Stripe (stripe)");
  });

  it("includes user choices when provided", () => {
    const prompt = buildSandboxPrompt({
      ...baseParams,
      techStackChoices: { email: "SendGrid" },
    });
    expect(prompt).toContain("email: SendGrid (user-chosen)");
  });

  it('shows "None" when no integrations', () => {
    const prompt = buildSandboxPrompt({
      ...baseParams,
      techStackResolved: [],
      matchGaps: [],
    });
    expect(prompt).toContain("None — template covers all needs.");
  });

  it("includes raw requirements as JSON", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain('"appName": "TestApp"');
  });

  it("includes all 7 instruction steps", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("1. docs/PRD.md");
    expect(prompt).toContain("2. docs/design.md");
    expect(prompt).toContain("3. template-CLAUDE.md");
    expect(prompt).toContain("4. TASKS.md");
    expect(prompt).toContain("5. docs/development-progress.yaml");
    expect(prompt).toContain("6. prompts/phase-1.md");
    expect(prompt).toContain("7. .claude/skills/");
  });

  it("includes match gaps", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("Payment processing");
  });

  it("uses 'None' fallback when match gaps are empty", () => {
    const prompt = buildSandboxPrompt({
      ...baseParams,
      matchGaps: [],
    });
    expect(prompt).toContain("Template gaps: None");
  });

  it("keeps guardrail that placeholders must be filled", () => {
    const prompt = buildSandboxPrompt(baseParams);
    expect(prompt).toContain("Do NOT leave any {{PLACEHOLDER}} unfilled");
  });
});

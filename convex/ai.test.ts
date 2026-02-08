import { describe, it, expect } from "vitest";
import {
  buildConversationMessages,
  buildRequirementsPrompt,
} from "./ai";

describe("buildConversationMessages", () => {
  it("builds messages with app idea prefix + history", () => {
    const msgs = buildConversationMessages("a todo app", [
      { role: "user", content: "I want a todo app" },
    ]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toContain("a todo app");
    expect(msgs[1].content).toBe("I want a todo app");
  });

  it("throws on empty appIdea", () => {
    expect(() =>
      buildConversationMessages("", [{ role: "user", content: "hello" }])
    ).toThrow("appIdea cannot be empty");
  });

  it("throws on whitespace-only appIdea", () => {
    expect(() =>
      buildConversationMessages("   ", [{ role: "user", content: "hello" }])
    ).toThrow("appIdea cannot be empty");
  });

  it("throws when all history messages are empty", () => {
    expect(() =>
      buildConversationMessages("a todo app", [
        { role: "user", content: "" },
        { role: "user", content: "   " },
      ])
    ).toThrow("history must contain at least one non-empty message");
  });

  it("throws on empty history array", () => {
    expect(() =>
      buildConversationMessages("a todo app", [])
    ).toThrow("history must contain at least one non-empty message");
  });

  it("filters out empty-content messages", () => {
    const msgs = buildConversationMessages("a todo app", [
      { role: "user", content: "hello" },
      { role: "assistant", content: "" },
      { role: "user", content: "world" },
    ]);
    // 1 prefix + 2 valid history (empty one filtered)
    expect(msgs).toHaveLength(3);
    expect(msgs.every((m) => m.content.trim().length > 0)).toBe(true);
  });

  it("adds wrap-up nudge at exchangeCount >= 6", () => {
    const msgs = buildConversationMessages(
      "a todo app",
      [{ role: "user", content: "hello" }],
      6,
    );
    const last = msgs[msgs.length - 1];
    expect(last.content).toContain("Wrap it up");
  });

  it("does not add nudge at exchangeCount < 6", () => {
    const msgs = buildConversationMessages(
      "a todo app",
      [{ role: "user", content: "hello" }],
      5,
    );
    expect(msgs.every((m) => !m.content.includes("Wrap it up"))).toBe(true);
  });

  it("does not add nudge when exchangeCount omitted", () => {
    const msgs = buildConversationMessages("a todo app", [
      { role: "user", content: "hello" },
    ]);
    expect(msgs.every((m) => !m.content.includes("Wrap it up"))).toBe(true);
  });
});

describe("buildRequirementsPrompt", () => {
  it("builds prompt with app idea", () => {
    const prompt = buildRequirementsPrompt("a todo app", []);
    expect(prompt).toContain('App idea: "a todo app"');
    expect(prompt).toContain("Extract structured requirements");
  });

  it("includes interview transcript", () => {
    const prompt = buildRequirementsPrompt("a todo app", [
      { role: "assistant", content: "Who is this for?" },
      { role: "user", content: "Small teams" },
    ]);
    expect(prompt).toContain("Interviewer: Who is this for?");
    expect(prompt).toContain("User: Small teams");
  });

  it("throws on empty appIdea", () => {
    expect(() => buildRequirementsPrompt("", [])).toThrow("appIdea cannot be empty");
  });

  it("throws on whitespace-only appIdea", () => {
    expect(() => buildRequirementsPrompt("  ", [])).toThrow("appIdea cannot be empty");
  });

  it("works with no messages", () => {
    const prompt = buildRequirementsPrompt("a todo app", []);
    expect(prompt).not.toContain("Interview transcript");
    expect(prompt).toContain("Extract structured requirements");
  });
});

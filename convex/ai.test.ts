import { describe, it, expect } from "vitest";
import {
  buildQuestionPrompt,
  buildConversationMessages,
  cleanQuestionResult,
  buildRequirementsPrompt,
} from "./ai";

describe("buildQuestionPrompt", () => {
  it("builds a round 1 prompt with app idea", () => {
    const prompt = buildQuestionPrompt("a todo app", 1);
    expect(prompt).toContain('The user wants to build: "a todo app"');
    expect(prompt).toContain("This is round 1");
    expect(prompt).toContain("Generate the interview questions");
  });

  it("includes previous rounds when provided", () => {
    const prompt = buildQuestionPrompt("a todo app", 2, [
      { questions: [{ id: "q1", question: "Who?" }], answers: { q1: "devs" } },
    ]);
    expect(prompt).toContain("Round 1:");
    expect(prompt).toContain("This is round 2");
    expect(prompt).not.toContain("This is round 1");
  });

  it("handles empty previousRounds as round 1", () => {
    const prompt = buildQuestionPrompt("a todo app", 1, []);
    expect(prompt).toContain("This is round 1");
  });
});

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

describe("cleanQuestionResult", () => {
  const validResult = {
    preamble: "Let's build your app",
    questions: [
      { id: "q1", question: "Who is this for?", type: "text" },
      { id: "q2", question: "Pick a stack", type: "choice", options: ["A", "B"] },
      { id: "q3", question: "Required?", type: "text", required: true },
    ],
  };

  it("strips unknown fields from questions", () => {
    const input = {
      preamble: "hi",
      questions: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: "q1", question: "test", type: "text", extraField: "junk", another: 42 } as any,
      ],
    };
    const result = cleanQuestionResult(input);
    expect(result.questions[0]).toEqual({ id: "q1", question: "test", type: "text" });
    expect(result.questions[0]).not.toHaveProperty("extraField");
  });

  it("preserves optional fields when present", () => {
    const result = cleanQuestionResult(validResult);
    expect(result.questions[1].options).toEqual(["A", "B"]);
    expect(result.questions[2].required).toBe(true);
  });

  it("throws on missing preamble", () => {
    expect(() =>
      cleanQuestionResult({ preamble: "", questions: [{ id: "q1", question: "x", type: "text" }] })
    ).toThrow("missing preamble or questions");
  });

  it("throws on empty questions array", () => {
    expect(() =>
      cleanQuestionResult({ preamble: "hello", questions: [] })
    ).toThrow("missing preamble or questions");
  });

  it("throws on question missing id", () => {
    expect(() =>
      cleanQuestionResult({
        preamble: "hello",
        questions: [{ id: "", question: "x", type: "text" }],
      })
    ).toThrow("Question missing required fields");
  });

  it("throws on question missing question text", () => {
    expect(() =>
      cleanQuestionResult({
        preamble: "hello",
        questions: [{ id: "q1", question: "", type: "text" }],
      })
    ).toThrow("Question missing required fields");
  });

  it("throws on question missing type", () => {
    expect(() =>
      cleanQuestionResult({
        preamble: "hello",
        questions: [{ id: "q1", question: "x", type: "" }],
      })
    ).toThrow("Question missing required fields");
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

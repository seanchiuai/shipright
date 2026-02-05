import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "./json";

describe("parseJsonResponse", () => {
  it("parses plain JSON", () => {
    const result = parseJsonResponse('{"key": "value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("parses JSON wrapped in ```json code block", () => {
    const result = parseJsonResponse('Some text\n```json\n{"key": "value"}\n```\nMore text');
    expect(result).toEqual({ key: "value" });
  });

  it("parses JSON wrapped in bare ``` code block", () => {
    const result = parseJsonResponse('```\n{"key": "value"}\n```');
    expect(result).toEqual({ key: "value" });
  });

  it("extracts JSON via regex fallback", () => {
    const result = parseJsonResponse('Here is the result: {"key": "value"} end');
    expect(result).toEqual({ key: "value" });
  });

  it("throws on invalid text with no JSON", () => {
    expect(() => parseJsonResponse("no json here")).toThrow("No valid JSON found");
  });

  it("handles nested objects", () => {
    const input = '{"outer": {"inner": [1, 2, 3]}}';
    const result = parseJsonResponse(input);
    expect(result).toEqual({ outer: { inner: [1, 2, 3] } });
  });

  it("handles whitespace around JSON", () => {
    const result = parseJsonResponse('  \n  {"key": "value"}  \n  ');
    expect(result).toEqual({ key: "value" });
  });

  it("handles JSON array in code block", () => {
    const result = parseJsonResponse('```json\n[1, 2, 3]\n```');
    expect(result).toEqual([1, 2, 3]);
  });
});

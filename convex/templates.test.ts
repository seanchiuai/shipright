import { describe, it, expect } from "vitest";
import { deepEqual } from "./templates";

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(0, 0)).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
  });

  it("returns true for identical strings", () => {
    expect(deepEqual("hello", "hello")).toBe(true);
    expect(deepEqual("", "")).toBe(true);
  });

  it("returns false for different types", () => {
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(true, 1)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("handles null correctly", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });

  it("compares arrays with same values", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });

  it("returns false for arrays with different length", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns false for arrays with different values", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("compares nested objects", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it("is irrelevant to key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("compares mixed structures", () => {
    const a = { items: [1, { x: true }], name: "test" };
    const b = { name: "test", items: [1, { x: true }] };
    expect(deepEqual(a, b)).toBe(true);

    const c = { items: [1, { x: false }], name: "test" };
    expect(deepEqual(a, c)).toBe(false);
  });
});

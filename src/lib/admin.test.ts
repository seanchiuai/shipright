import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAdmin } from "./admin";

describe("isAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when userId matches env var", () => {
    process.env.NEXT_PUBLIC_ADMIN_USER_ID = "user_abc123";
    expect(isAdmin("user_abc123")).toBe(true);
  });

  it("returns false when userId does not match", () => {
    process.env.NEXT_PUBLIC_ADMIN_USER_ID = "user_abc123";
    expect(isAdmin("user_xyz789")).toBe(false);
  });

  it("returns false when env var is undefined", () => {
    delete process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    expect(isAdmin("user_abc123")).toBe(false);
  });

  it("returns false when userId is empty", () => {
    process.env.NEXT_PUBLIC_ADMIN_USER_ID = "user_abc123";
    expect(isAdmin("")).toBe(false);
  });
});

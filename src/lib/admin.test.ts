import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdmin, isSafeRedirectPath } from "./admin";

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

describe("isSafeRedirectPath", () => {
  it("allows simple paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/project/abc123")).toBe(true);
    expect(isSafeRedirectPath("/connect-github")).toBe(true);
  });

  it("blocks protocol-relative URLs", () => {
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
    expect(isSafeRedirectPath("//evil.com/path")).toBe(false);
  });

  it("blocks backslash tricks", () => {
    expect(isSafeRedirectPath("/\\evil.com")).toBe(false);
  });

  it("blocks non-path strings", () => {
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectPath("")).toBe(false);
  });

  it("allows paths with query params", () => {
    expect(isSafeRedirectPath("/dashboard?tab=settings")).toBe(true);
  });

  it("allows paths with hash fragments", () => {
    expect(isSafeRedirectPath("/docs#section")).toBe(true);
  });
});

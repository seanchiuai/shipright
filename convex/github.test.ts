import { describe, it, expect } from "vitest";
import { parseTemplateUrl, isBinaryFile } from "./github";

describe("parseTemplateUrl", () => {
  it("parses simple github.com/owner/repo", () => {
    const result = parseTemplateUrl("https://github.com/vercel/next.js");
    expect(result).toEqual({
      owner: "vercel",
      repo: "next.js",
      subpath: "",
    });
  });

  it("parses URL with tree/branch", () => {
    const result = parseTemplateUrl("https://github.com/owner/repo/tree/main");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      ref: "main",
      subpath: "",
    });
  });

  it("parses URL with tree/branch/subpath", () => {
    const result = parseTemplateUrl(
      "https://github.com/owner/repo/tree/main/packages/app"
    );
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      ref: "main",
      subpath: "packages/app",
    });
  });

  it("parses URL with deep subpath", () => {
    const result = parseTemplateUrl(
      "https://github.com/owner/repo/tree/develop/src/templates/starter"
    );
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      ref: "develop",
      subpath: "src/templates/starter",
    });
  });

  it("does not set ref when no tree segment", () => {
    const result = parseTemplateUrl("https://github.com/owner/repo");
    expect(result.ref).toBeUndefined();
  });
});

describe("isBinaryFile", () => {
  it("returns true for .png", () => {
    expect(isBinaryFile("image.png", 100)).toBe(true);
  });

  it("returns true for .jpg", () => {
    expect(isBinaryFile("photo.jpg", 100)).toBe(true);
  });

  it("returns true for .woff2", () => {
    expect(isBinaryFile("font.woff2", 100)).toBe(true);
  });

  it("returns true for .lock", () => {
    expect(isBinaryFile("package-lock.json.lock", 100)).toBe(true);
  });

  it("returns true for .pdf", () => {
    expect(isBinaryFile("document.pdf", 100)).toBe(true);
  });

  it("returns true for .wasm", () => {
    expect(isBinaryFile("module.wasm", 100)).toBe(true);
  });

  it("returns false for .ts", () => {
    expect(isBinaryFile("index.ts", 100)).toBe(false);
  });

  it("returns false for .json", () => {
    expect(isBinaryFile("package.json", 100)).toBe(false);
  });

  it("returns false for .md", () => {
    expect(isBinaryFile("README.md", 100)).toBe(false);
  });

  it("returns false for .tsx", () => {
    expect(isBinaryFile("component.tsx", 100)).toBe(false);
  });

  it("returns true for files over 1MB regardless of extension", () => {
    expect(isBinaryFile("big.ts", 1024 * 1024 + 1)).toBe(true);
  });

  it("handles multiple dots in filename", () => {
    expect(isBinaryFile("my.component.test.tsx", 100)).toBe(false);
  });

  it("returns true for .lock files (like yarn.lock)", () => {
    expect(isBinaryFile("yarn.lock", 100)).toBe(true);
  });
});

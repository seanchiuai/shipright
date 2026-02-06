import { describe, it, expect, vi } from "vitest";
import { validateRepoAccess, parseRepoFullName } from "./github";

describe("parseRepoFullName", () => {
  it("parses owner/repo format", () => {
    expect(parseRepoFullName("seanchiuai/my-app")).toEqual({
      owner: "seanchiuai",
      repo: "my-app",
    });
  });

  it("handles repos with dots and hyphens", () => {
    expect(parseRepoFullName("org-name/my.repo-v2")).toEqual({
      owner: "org-name",
      repo: "my.repo-v2",
    });
  });

  it("returns null for invalid format", () => {
    expect(parseRepoFullName("noslash")).toBeNull();
    expect(parseRepoFullName("")).toBeNull();
    expect(parseRepoFullName("too/many/slashes")).toBeNull();
  });
});

describe("validateRepoAccess", () => {
  it("calls repos.get with owner and repo", async () => {
    const get = vi.fn(async () => ({ status: 200, data: {} }));
    const mockOctokit = {
      rest: {
        repos: { get },
      },
    };

    await validateRepoAccess(mockOctokit as never, "owner-x", "repo-y");
    await expect(get).toHaveBeenCalledWith({ owner: "owner-x", repo: "repo-y" });
  });

  it("returns accessible:true for 200 response", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => ({ status: 200, data: {} }),
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({ accessible: true });
  });

  it("returns deleted for 404", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw Object.assign(new Error("Not Found"), { status: 404 });
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "deleted",
      message:
        "Your GitHub repository was deleted. Create a new one to continue.",
    });
  });

  it("returns token_expired for 401", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw Object.assign(new Error("Unauthorized"), { status: 401 });
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "token_expired",
      message: "Your GitHub connection has expired.",
    });
  });

  it("returns permission_denied for 403", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw Object.assign(new Error("Forbidden"), { status: 403 });
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "permission_denied",
      message: "You no longer have write access to this repository.",
    });
  });

  it("returns unknown for other errors", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw Object.assign(new Error("Server Error"), { status: 500 });
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "unknown",
      message: "Unable to access repository: Server Error",
    });
  });

  it("returns unknown for network errors without status", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw new Error("ECONNRESET");
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "unknown",
      message: "Unable to access repository: ECONNRESET",
    });
  });

  it("returns unknown for non-Error thrown values", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          get: async () => {
            throw { status: 502 };
          },
        },
      },
    };

    const result = await validateRepoAccess(
      mockOctokit as never,
      "owner",
      "repo"
    );
    expect(result).toEqual({
      accessible: false,
      reason: "unknown",
      message: "Unable to access repository: Unknown error",
    });
  });
});

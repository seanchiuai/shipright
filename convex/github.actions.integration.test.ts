import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = {
  users: {
    current: "users.current",
    saveGitHubToken: "users.saveGitHubToken",
  },
  projects: {
    setRepoFailed: "projects.setRepoFailed",
  },
};

const internalMock = {
  pipelineEvents: { log: "internal.pipelineEvents.log" },
  projects: {
    claimForRepoCreation: "internal.projects.claimForRepoCreation",
    getById: "internal.projects.getById",
    markRepoReady: "internal.projects.markRepoReady",
    updateGitHubRepo: "internal.projects.updateGitHubRepo",
  },
};

const encryptTokenMock = vi.fn((s: string) => `enc:${s}`);
const decryptTokenMock = vi.fn(() => "gh_token");
const reportToSentryMock = vi.fn(async () => undefined);
const fetchRepoFilesMock = vi.fn();
const commitFilesMock = vi.fn(async () => undefined);

const octokitUsersGetAuthenticatedMock = vi.fn();
const octokitCreateRepoMock = vi.fn();

vi.mock("./_generated/server", () => ({
  action: (config: { handler: unknown }) => ({ handler: config.handler }),
  mutation: (config: { handler: unknown }) => ({ handler: config.handler }),
  internalMutation: (config: { handler: unknown }) => ({ handler: config.handler }),
  internalQuery: (config: { handler: unknown }) => ({ handler: config.handler }),
  query: (config: { handler: unknown }) => ({ handler: config.handler }),
}));

vi.mock("./_generated/api", () => ({ api: apiMock, internal: internalMock }));

vi.mock("convex/values", () => ({
  v: {
    id: () => "id",
    string: () => "string",
    number: () => 1,
    optional: (x: unknown) => x,
    any: () => ({}),
  },
}));

vi.mock("octokit", () => ({
  Octokit: class {
    rest = {
      users: { getAuthenticated: octokitUsersGetAuthenticatedMock },
      repos: { createForAuthenticatedUser: octokitCreateRepoMock },
    };
  },
}));

vi.mock("../lib/encryption", () => ({
  encryptToken: encryptTokenMock,
  decryptToken: decryptTokenMock,
}));

vi.mock("./lib/sentry", () => ({ reportToSentry: reportToSentryMock }));

vi.mock("./lib/git_operations", () => ({
  fetchRepoFiles: fetchRepoFilesMock,
  commitFiles: commitFilesMock,
  isBinaryFile: vi.fn(),
}));

type ActionHandler = (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;

function getActionHandler(action: unknown): ActionHandler {
  return (action as { handler: ActionHandler }).handler;
}

function makeCtx() {
  const runQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
  const runMutation = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
  const auth = { getUserIdentity: vi.fn(async () => ({ subject: "user_1" })) };
  return { runQuery, runMutation, auth };
}

describe("github actions integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    octokitUsersGetAuthenticatedMock.mockResolvedValue({ data: { login: "sean" } });
  });

  it("exchangeGitHubCode stores encrypted token on successful OAuth exchange", async () => {
    const ctx = makeCtx();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ access_token: "gho_123" }),
      })),
    );

    const mod = await import("./github");
    const result = await getActionHandler(mod.exchangeGitHubCode)(ctx, { code: "oauth_code" });

    expect(result).toEqual({ success: true });
    expect(encryptTokenMock).toHaveBeenCalledWith("gho_123");
    expect(ctx.runMutation).toHaveBeenCalledWith(apiMock.users.saveGitHubToken, { encryptedToken: "enc:gho_123" });
  });

  it("validateToken returns expired when GitHub API returns 401", async () => {
    const ctx = makeCtx();
    ctx.runQuery.mockResolvedValue({ githubToken: "enc_token" });
    octokitUsersGetAuthenticatedMock.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));

    const mod = await import("./github");
    const result = await getActionHandler(mod.validateToken)(ctx, {});

    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("cloneTemplate marks repo_failed and rethrows when template repo fetch returns 404", async () => {
    const ctx = makeCtx();
    ctx.runQuery.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as string;
      if (fn === apiMock.users.current) return { githubToken: "enc_token" };
      return null;
    });
    ctx.runMutation.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as string;
      if (fn === internalMock.projects.claimForRepoCreation) return { claimed: true };
      return undefined;
    });

    fetchRepoFilesMock.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));

    const mod = await import("./github");

    await expect(
      getActionHandler(mod.cloneTemplate)(ctx, {
        projectId: "p1",
        templateSourceUrl: "https://github.com/acme/template",
        newRepoName: "my-app",
      }),
    ).rejects.toThrow("Template repository not found");

    expect(ctx.runMutation).toHaveBeenCalledWith(
      apiMock.projects.setRepoFailed,
      expect.objectContaining({ projectId: "p1" }),
    );
    expect(reportToSentryMock).toHaveBeenCalled();
  });
});

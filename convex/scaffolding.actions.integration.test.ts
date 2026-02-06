import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = {
  pipelineEvents: { log: "pipelineEvents.log" },
  projects: {
    get: "projects.get",
    saveSandboxInfo: "projects.saveSandboxInfo",
    saveTechStackResearch: "projects.saveTechStackResearch",
    savePrdMarkdown: "projects.savePrdMarkdown",
    submitTechChoices: "projects.submitTechChoices",
    updateScaffoldingStatus: "projects.updateScaffoldingStatus",
    updateStatus: "projects.updateStatus",
  },
  templates: { list: "templates.list" },
  scaffolding: {
    executeSandbox: "scaffolding.executeSandbox",
    pollSandbox: "scaffolding.pollSandbox",
    generatePrd: "scaffolding.generatePrd",
    researchTechStack: "scaffolding.researchTechStack",
  },
};

const internalMock = {
  users: { getById: "internal.users.getById" },
};

const withRetryMock = vi.fn(async (fn: () => unknown) => await fn());
const validateRepoAccessMock = vi.fn();
const parseRepoFullNameMock = vi.fn();
const decryptTokenMock = vi.fn();
const reportToSentryMock = vi.fn(async () => undefined);
const buildSandboxCredentialsMock = vi.fn(() => [{ key: "GITHUB_TOKEN", value: "token" }]);
const provisionSandboxCredentialsMock = vi.fn(async () => undefined);
const validateCredentialsAvailableMock = vi.fn();

const daytonaCreateMock = vi.fn();
const daytonaGetMock = vi.fn();
const daytonaDeleteMock = vi.fn(async () => undefined);

vi.mock("./_generated/server", () => ({
  action: (config: { handler: unknown }) => ({ handler: config.handler }),
  mutation: (config: { handler: unknown }) => ({ handler: config.handler }),
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

vi.mock("@daytonaio/sdk", () => ({
  Daytona: class {
    create = daytonaCreateMock;
    get = daytonaGetMock;
    delete = daytonaDeleteMock;
  },
}));

vi.mock("./lib/retry", () => ({
  withRetry: withRetryMock,
  GITHUB_RETRY_CONFIG: { maxAttempts: 3 },
  DAYTONA_RETRY_CONFIG: { maxAttempts: 3 },
}));

vi.mock("./lib/github", () => ({
  validateRepoAccess: validateRepoAccessMock,
  parseRepoFullName: parseRepoFullNameMock,
}));

vi.mock("../lib/encryption", () => ({
  decryptToken: decryptTokenMock,
}));

vi.mock("./lib/sentry", () => ({ reportToSentry: reportToSentryMock }));

vi.mock("./lib/credentials", () => ({
  buildSandboxCredentials: buildSandboxCredentialsMock,
  provisionSandboxCredentials: provisionSandboxCredentialsMock,
  validateCredentialsAvailable: validateCredentialsAvailableMock,
}));

vi.mock("octokit", () => ({
  Octokit: class {
    rest = {};
  },
}));
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("./lib/vertex", () => ({ getVertexProvider: vi.fn() }));
vi.mock("./lib/json", () => ({ parseJsonResponse: vi.fn() }));

type ActionHandler = (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;

function getActionHandler(action: unknown): ActionHandler {
  return (action as { handler: ActionHandler }).handler;
}

function makeCtx(overrides?: Partial<Record<string, unknown>>) {
  const runQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
  const runMutation = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
  const runAction = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
  const scheduler = { runAfter: vi.fn(async () => undefined) };
  return {
    runQuery,
    runMutation,
    runAction,
    scheduler,
    ...(overrides || {}),
  };
}

function makeSandbox(processImpl?: (cmd: string) => { result?: string; exitCode?: number }) {
  return {
    id: "sb_123",
    git: { clone: vi.fn(async () => undefined) },
    fs: { uploadFile: vi.fn(async () => undefined) },
    process: {
      executeCommand: vi.fn(async (cmd: string) => {
        if (processImpl) return processImpl(cmd);
        if (cmd === "echo $HOME") return { result: "/home/daytona\n", exitCode: 0 };
        return { result: "", exitCode: 0 };
      }),
    },
  };
}

describe("scaffolding actions integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRetryMock.mockImplementation(async (fn: () => unknown) => await fn());
    parseRepoFullNameMock.mockReturnValue({ owner: "owner", repo: "repo" });
    validateRepoAccessMock.mockResolvedValue({ accessible: true });
    decryptTokenMock.mockReturnValue("gh_token");
  });

  it("runScaffoldingPipeline schedules executeSandbox when no user choices are needed", async () => {
    const { runQuery, runAction, runMutation, scheduler } = makeCtx();
    runQuery
      .mockResolvedValueOnce({ _id: "p1", prdMarkdown: null, techStackResearch: null })
      .mockResolvedValueOnce({ _id: "p1", scaffoldingStatus: "preparing_sandbox" });

    const mod = await import("./scaffolding");
    await getActionHandler(mod.runScaffoldingPipeline)(
      { runQuery, runAction, runMutation, scheduler },
      { projectId: "p1" },
    );

    expect(runAction).toHaveBeenCalledWith(apiMock.scaffolding.generatePrd, { projectId: "p1" });
    expect(runAction).toHaveBeenCalledWith(apiMock.scaffolding.researchTechStack, { projectId: "p1" });
    expect(scheduler.runAfter).toHaveBeenCalledWith(0, apiMock.scaffolding.executeSandbox, { projectId: "p1" });
  });

  it("runScaffoldingPipeline marks scaffolding_failed and rethrows when an action fails", async () => {
    const { runQuery, runAction, runMutation, scheduler } = makeCtx();
    runQuery.mockResolvedValue({ _id: "p1", prdMarkdown: null, techStackResearch: null });
    runAction.mockRejectedValue(new Error("generate failed"));

    const mod = await import("./scaffolding");

    await expect(
      getActionHandler(mod.runScaffoldingPipeline)(
        { runQuery, runAction, runMutation, scheduler },
        { projectId: "p1" },
      ),
    ).rejects.toThrow("generate failed");

    expect(runMutation).toHaveBeenCalledWith(
      apiMock.projects.updateScaffoldingStatus,
      expect.objectContaining({
        projectId: "p1",
        scaffoldingStatus: "scaffolding_failed",
      }),
    );
  });

  it("executeSandbox runs full happy-path and schedules pollSandbox", async () => {
    const sandbox = makeSandbox();
    daytonaCreateMock.mockResolvedValue(sandbox);

    const { runQuery, runMutation, scheduler } = makeCtx();
    runQuery.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as string;
      if (fn === apiMock.projects.get) {
        return {
          _id: "p1",
          userId: "u1",
          templateId: "t1",
          templateName: "Starter",
          githubRepoFullName: "owner/repo",
          prdMarkdown: "# PRD",
          requirements: { appName: "App" },
          matchGaps: [],
          techStackResearch: { resolved: [] },
        };
      }
      if (fn === internalMock.users.getById) return { githubToken: "enc" };
      if (fn === apiMock.templates.list) return [{ _id: "t1", stack: ["next", "convex"] }];
      return null;
    });

    const mod = await import("./scaffolding");
    await getActionHandler(mod.executeSandbox)(
      { runQuery, runMutation, scheduler },
      { projectId: "p1" },
    );

    expect(validateCredentialsAvailableMock).toHaveBeenCalledWith("gh_token");
    expect(runMutation).toHaveBeenCalledWith(
      apiMock.projects.saveSandboxInfo,
      expect.objectContaining({ projectId: "p1", sandboxId: "sb_123" }),
    );
    expect(runMutation).toHaveBeenCalledWith(
      apiMock.projects.updateScaffoldingStatus,
      expect.objectContaining({ projectId: "p1", scaffoldingStatus: "running_sandbox" }),
    );
    expect(scheduler.runAfter).toHaveBeenCalledWith(
      mod.POLLING_CONFIG.initialDelayMs,
      apiMock.scaffolding.pollSandbox,
      { projectId: "p1" },
    );
  });

  it("executeSandbox marks scaffolding_failed when repo access fails", async () => {
    validateRepoAccessMock.mockResolvedValue({ accessible: false, message: "repo denied" });
    const { runQuery, runMutation, scheduler } = makeCtx();
    runQuery.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as string;
      if (fn === apiMock.projects.get) {
        return {
          _id: "p1",
          userId: "u1",
          templateId: "t1",
          templateName: "Starter",
          githubRepoFullName: "owner/repo",
          prdMarkdown: "# PRD",
          requirements: { appName: "App" },
          matchGaps: [],
          techStackResearch: { resolved: [] },
        };
      }
      if (fn === internalMock.users.getById) return { githubToken: "enc" };
      if (fn === apiMock.templates.list) return [{ _id: "t1", stack: ["next", "convex"] }];
      return null;
    });

    const mod = await import("./scaffolding");
    await getActionHandler(mod.executeSandbox)(
      { runQuery, runMutation, scheduler },
      { projectId: "p1" },
    );

    expect(runMutation).toHaveBeenCalledWith(
      apiMock.projects.updateScaffoldingStatus,
      expect.objectContaining({ scaffoldingStatus: "scaffolding_failed" }),
    );
  });

  it("pollSandbox re-schedules when Claude is still running", async () => {
    const sandbox = makeSandbox((cmd) => {
      if (cmd.includes("cat /tmp/claude_exit_code")) return { result: "RUNNING\n", exitCode: 0 };
      if (cmd.includes("wc -c")) return { result: "0\n", exitCode: 0 };
      return { result: "", exitCode: 0 };
    });
    daytonaGetMock.mockResolvedValue(sandbox);

    const { runQuery, runMutation, scheduler } = makeCtx();
    runQuery.mockResolvedValue({
      _id: "p1",
      userId: "u1",
      githubRepoFullName: "owner/repo",
      sandboxId: "sb_123",
      sandboxSessionId: "nohup",
      scaffoldingStatus: "running_sandbox",
    });

    const mod = await import("./scaffolding");
    await getActionHandler(mod.pollSandbox)(
      { runQuery, runMutation, scheduler },
      { projectId: "p1", pollCount: 1 },
    );

    expect(scheduler.runAfter).toHaveBeenCalledWith(
      mod.POLLING_CONFIG.intervalMs,
      apiMock.scaffolding.pollSandbox,
      { projectId: "p1", pollCount: 2 },
    );
  });

  it("pollSandbox completes and marks scaffolding_complete when Claude and push succeed", async () => {
    const sandbox = makeSandbox((cmd) => {
      if (cmd.includes("cat /tmp/claude_exit_code")) return { result: "0\n", exitCode: 0 };
      if (cmd.includes("git diff --cached --stat")) return { result: "1 file changed", exitCode: 0 };
      if (cmd.includes("git add . && git commit")) return { result: "pushed", exitCode: 0 };
      return { result: "", exitCode: 0 };
    });
    daytonaGetMock.mockResolvedValue(sandbox);

    const { runQuery, runMutation, scheduler } = makeCtx();
    let projectGetCalls = 0;
    runQuery.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as string;
      if (fn === apiMock.projects.get) {
        projectGetCalls += 1;
        if (projectGetCalls === 1) {
          return {
            _id: "p1",
            userId: "u1",
            githubRepoFullName: "owner/repo",
            sandboxId: "sb_123",
            sandboxSessionId: "nohup",
            scaffoldingStatus: "running_sandbox",
          };
        }
        return { scaffoldingStatus: "scaffolding_complete" };
      }
      if (fn === internalMock.users.getById) return { githubToken: "enc" };
      return null;
    });

    const mod = await import("./scaffolding");
    await getActionHandler(mod.pollSandbox)(
      { runQuery, runMutation, scheduler },
      { projectId: "p1", pollCount: 3 },
    );

    expect(runMutation).toHaveBeenCalledWith(
      apiMock.projects.updateScaffoldingStatus,
      expect.objectContaining({ projectId: "p1", scaffoldingStatus: "scaffolding_complete" }),
    );
    expect(daytonaDeleteMock).toHaveBeenCalledOnce();
  });
});

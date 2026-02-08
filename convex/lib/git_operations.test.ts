import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Octokit } from "octokit";
import {
  fetchRepoFiles,
  waitForRef,
  createBlobWithRetry,
  createBlobsBatched,
  commitFiles,
} from "./git_operations";

// Retry logic intentionally handles rejections asynchronously (after backoff delays),
// which triggers Node's unhandled rejection tracker before the catch block runs.
// This is expected behavior for retry patterns with fake timers.
const rejections = new Set<Promise<unknown>>();
process.on("unhandledRejection", (_reason, promise) => { rejections.add(promise); });
process.on("rejectionHandled", (promise) => { rejections.delete(promise); });

// Flush all pending timers and microtasks
async function flushAll() {
  await vi.runAllTimersAsync();
}

// Helper to create a mock Octokit with sensible defaults
function createMockOctokit(overrides?: {
  repos?: { get?: ReturnType<typeof vi.fn> };
  git?: {
    getRef?: ReturnType<typeof vi.fn>;
    getTree?: ReturnType<typeof vi.fn>;
    getBlob?: ReturnType<typeof vi.fn>;
    getCommit?: ReturnType<typeof vi.fn>;
    createBlob?: ReturnType<typeof vi.fn>;
    createTree?: ReturnType<typeof vi.fn>;
    createCommit?: ReturnType<typeof vi.fn>;
    updateRef?: ReturnType<typeof vi.fn>;
  };
}) {
  return {
    rest: {
      repos: {
        get: overrides?.repos?.get ?? vi.fn().mockResolvedValue({ data: { default_branch: "main" } }),
      },
      git: {
        getRef: overrides?.git?.getRef ?? vi.fn().mockResolvedValue({ data: { object: { sha: "abc123" } } }),
        getTree: overrides?.git?.getTree ?? vi.fn().mockResolvedValue({ data: { tree: [] } }),
        getBlob: overrides?.git?.getBlob ?? vi.fn().mockResolvedValue({ data: { content: "", size: 0 } }),
        getCommit: overrides?.git?.getCommit ?? vi.fn().mockResolvedValue({ data: { tree: { sha: "tree-sha" } } }),
        createBlob: overrides?.git?.createBlob ?? vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } }),
        createTree: overrides?.git?.createTree ?? vi.fn().mockResolvedValue({ data: { sha: "new-tree-sha" } }),
        createCommit: overrides?.git?.createCommit ?? vi.fn().mockResolvedValue({ data: { sha: "commit-sha" } }),
        updateRef: overrides?.git?.updateRef ?? vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as Octokit;
}

describe("waitForRef", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on first try after 2s initial delay", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "abc123" } } });
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main");
    await vi.advanceTimersByTimeAsync(2000); // initial delay
    const sha = await promise;

    expect(sha).toBe("abc123");
    expect(getRef).toHaveBeenCalledTimes(1);
    expect(getRef).toHaveBeenCalledWith({ owner: "owner", repo: "repo", ref: "heads/main" });
  });

  it("succeeds after 3 transient failures", async () => {
    const getRef = vi.fn()
      .mockRejectedValueOnce(new Error("Not Found"))
      .mockRejectedValueOnce(new Error("Not Found"))
      .mockRejectedValueOnce(new Error("Not Found"))
      .mockResolvedValue({ data: { object: { sha: "found-sha" } } });
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main");
    // Initial 2s delay
    await vi.advanceTimersByTimeAsync(2000);
    // Retry 0 fails, backoff 1s
    await vi.advanceTimersByTimeAsync(1000);
    // Retry 1 fails, backoff 2s
    await vi.advanceTimersByTimeAsync(2000);
    // Retry 2 fails, backoff 4s
    await vi.advanceTimersByTimeAsync(4000);
    // Retry 3 succeeds
    const sha = await promise;

    expect(sha).toBe("found-sha");
    expect(getRef).toHaveBeenCalledTimes(4);
  });

  it("throws after all 8 retries exhausted", async () => {
    const error = new Error("Not Found");
    const getRef = vi.fn().mockRejectedValue(error);
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main");
    await flushAll();

    await expect(promise).rejects.toThrow("Not Found");
    expect(getRef).toHaveBeenCalledTimes(8);
  });

  it("uses exponential backoff capped at 10s", async () => {
    const getRef = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue({ data: { object: { sha: "sha" } } });
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main");
    await vi.advanceTimersByTimeAsync(2000); // initial delay

    // Backoff 0: min(1000*2^0, 10000) = 1000
    await vi.advanceTimersByTimeAsync(1000);
    // Backoff 1: min(1000*2^1, 10000) = 2000
    await vi.advanceTimersByTimeAsync(2000);
    // Backoff 2: min(1000*2^2, 10000) = 4000
    await vi.advanceTimersByTimeAsync(4000);
    // Backoff 3: min(1000*2^3, 10000) = 8000
    await vi.advanceTimersByTimeAsync(8000);
    // Backoff 4: min(1000*2^4, 10000) = 10000 (capped)
    await vi.advanceTimersByTimeAsync(10000);

    const sha = await promise;
    expect(sha).toBe("sha");
    expect(getRef).toHaveBeenCalledTimes(6);
  });

  it("respects custom maxRetries parameter", async () => {
    const getRef = vi.fn().mockRejectedValue(new Error("fail"));
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main", 2);
    await flushAll();

    await expect(promise).rejects.toThrow("fail");
    expect(getRef).toHaveBeenCalledTimes(2);
  });

  it("propagates original error on final failure", async () => {
    const originalError = Object.assign(new Error("Git ref not found"), { status: 404 });
    const getRef = vi.fn().mockRejectedValue(originalError);
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main", 1);
    await flushAll();

    await expect(promise).rejects.toBe(originalError);
  });

  it("returns SHA from ref object", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "specific-sha-value" } } });
    const octokit = createMockOctokit({ git: { getRef } });

    const promise = waitForRef(octokit, "owner", "repo", "heads/main");
    await vi.advanceTimersByTimeAsync(2000);
    const sha = await promise;

    expect(sha).toBe("specific-sha-value");
  });
});

describe("createBlobWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates blob for text file (base64 encodes content)", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "src/index.ts", content: "console.log('hello')", isBinary: false };
    const result = await createBlobWithRetry(octokit, "owner", "repo", file);

    expect(result).toEqual({ path: "src/index.ts", sha: "blob-sha" });
    expect(createBlob).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      content: Buffer.from("console.log('hello')").toString("base64"),
      encoding: "base64",
    });
  });

  it("creates blob for binary file (passes content as-is)", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "bin-sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const binaryContent = "iVBORw0KGgoAAAA=="; // already base64
    const file = { path: "logo.png", content: binaryContent, isBinary: true };
    const result = await createBlobWithRetry(octokit, "owner", "repo", file);

    expect(result).toEqual({ path: "logo.png", sha: "bin-sha" });
    expect(createBlob).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      content: binaryContent,
      encoding: "base64",
    });
  });

  it("retries on 'Git Repository is empty' with 3s base backoff", async () => {
    const createBlob = vi.fn()
      .mockRejectedValueOnce(new Error("Git Repository is empty"))
      .mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "x", isBinary: false };
    const promise = createBlobWithRetry(octokit, "owner", "repo", file);
    // Backoff: min(3000*2^0, 15000) = 3000
    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;

    expect(result.sha).toBe("sha");
    expect(createBlob).toHaveBeenCalledTimes(2);
  });

  it("retries on generic error with 1s base backoff", async () => {
    const createBlob = vi.fn()
      .mockRejectedValueOnce(new Error("Server Error"))
      .mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "x", isBinary: false };
    const promise = createBlobWithRetry(octokit, "owner", "repo", file);
    // Backoff: min(1000*2^0, 10000) = 1000
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.sha).toBe("sha");
    expect(createBlob).toHaveBeenCalledTimes(2);
  });

  it("throws after 5 attempts exhausted", async () => {
    const error = new Error("persistent failure");
    const createBlob = vi.fn().mockRejectedValue(error);
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "x", isBinary: false };
    const promise = createBlobWithRetry(octokit, "owner", "repo", file);
    await flushAll();

    await expect(promise).rejects.toThrow("persistent failure");
    expect(createBlob).toHaveBeenCalledTimes(5);
  });

  it("respects custom maxRetries parameter", async () => {
    const createBlob = vi.fn().mockRejectedValue(new Error("fail"));
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "x", isBinary: false };
    const promise = createBlobWithRetry(octokit, "owner", "repo", file, 2);
    await flushAll();

    await expect(promise).rejects.toThrow("fail");
    expect(createBlob).toHaveBeenCalledTimes(2);
  });

  it("caps 'Git Repository is empty' backoff at 15s", async () => {
    const createBlob = vi.fn()
      .mockRejectedValueOnce(new Error("Git Repository is empty"))
      .mockRejectedValueOnce(new Error("Git Repository is empty"))
      .mockRejectedValueOnce(new Error("Git Repository is empty"))
      .mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "x", isBinary: false };
    const promise = createBlobWithRetry(octokit, "owner", "repo", file);
    // Backoff 0: min(3000*1, 15000) = 3000
    await vi.advanceTimersByTimeAsync(3000);
    // Backoff 1: min(3000*2, 15000) = 6000
    await vi.advanceTimersByTimeAsync(6000);
    // Backoff 2: min(3000*4, 15000) = 12000
    await vi.advanceTimersByTimeAsync(12000);
    const result = await promise;

    expect(result.sha).toBe("sha");
    expect(createBlob).toHaveBeenCalledTimes(4);
  });

  it("succeeds on first attempt without retries", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });

    const file = { path: "f.ts", content: "hello", isBinary: false };
    const result = await createBlobWithRetry(octokit, "owner", "repo", file);

    expect(result).toEqual({ path: "f.ts", sha: "sha" });
    expect(createBlob).toHaveBeenCalledTimes(1);
  });
});

describe("createBlobsBatched", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("single batch when files < batchSize", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });
    const files = [
      { path: "a.ts", content: "a", isBinary: false },
      { path: "b.ts", content: "b", isBinary: false },
    ];

    const results = await createBlobsBatched(octokit, "owner", "repo", files, 10);

    expect(results).toHaveLength(2);
    expect(results[0].path).toBe("a.ts");
    expect(results[1].path).toBe("b.ts");
    expect(createBlob).toHaveBeenCalledTimes(2);
  });

  it("multiple batches with 500ms inter-batch delay", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });
    const files = [
      { path: "a.ts", content: "a", isBinary: false },
      { path: "b.ts", content: "b", isBinary: false },
      { path: "c.ts", content: "c", isBinary: false },
    ];

    const promise = createBlobsBatched(octokit, "owner", "repo", files, 2);
    // First batch (a, b) resolves immediately
    // 500ms delay between batches
    await vi.advanceTimersByTimeAsync(500);
    // Second batch (c)
    const results = await promise;

    expect(results).toHaveLength(3);
    expect(createBlob).toHaveBeenCalledTimes(3);
  });

  it("no delay after final batch", async () => {
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "sha" } });
    const octokit = createMockOctokit({ git: { createBlob } });
    const files = [
      { path: "a.ts", content: "a", isBinary: false },
      { path: "b.ts", content: "b", isBinary: false },
    ];

    // With batchSize=2, all files fit in one batch — no delay
    const results = await createBlobsBatched(octokit, "owner", "repo", files, 2);

    expect(results).toHaveLength(2);
  });

  it("propagates failure from inner createBlobWithRetry", async () => {
    const createBlob = vi.fn().mockRejectedValue(new Error("blob fail"));
    const octokit = createMockOctokit({ git: { createBlob } });
    const files = [{ path: "a.ts", content: "a", isBinary: false }];

    const promise = createBlobsBatched(octokit, "owner", "repo", files, 10);
    await flushAll();

    await expect(promise).rejects.toThrow("blob fail");
  });

  it("returns empty array for empty files list", async () => {
    const octokit = createMockOctokit();
    const results = await createBlobsBatched(octokit, "owner", "repo", []);
    expect(results).toEqual([]);
  });
});

describe("commitFiles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("happy path: text-only files (all go through createBlob)", async () => {
    let blobCounter = 0;
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "parent-sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "base-tree-sha" } } });
    const createBlob = vi.fn().mockImplementation(() => ({ data: { sha: `blob-sha-${blobCounter++}` } }));
    const createTree = vi.fn().mockResolvedValue({ data: { sha: "new-tree-sha" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "commit-sha" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [
      { path: "src/index.ts", content: "const x = 1;", isBinary: false },
      { path: "README.md", content: "# Hello", isBinary: false },
    ];

    const promise = commitFiles(octokit, "owner", "repo", files, "Initial commit");
    await vi.advanceTimersByTimeAsync(2000); // waitForRef initial delay
    await promise;

    expect(getRef).toHaveBeenCalledWith({ owner: "owner", repo: "repo", ref: "heads/main" });
    expect(getCommit).toHaveBeenCalledWith({ owner: "owner", repo: "repo", commit_sha: "parent-sha" });
    expect(createBlob).toHaveBeenCalledTimes(2);
    expect(createTree).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      tree: [
        { path: "src/index.ts", mode: "100644", type: "blob", sha: "blob-sha-0" },
        { path: "README.md", mode: "100644", type: "blob", sha: "blob-sha-1" },
      ],
      base_tree: "base-tree-sha",
    });
    expect(createCommit).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      message: "Initial commit",
      tree: "new-tree-sha",
      parents: ["parent-sha"],
    });
    expect(updateRef).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      ref: "heads/main",
      sha: "commit-sha",
    });
  });

  it("happy path: mixed text + binary files (all go through createBlob)", async () => {
    let blobCounter = 0;
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "parent-sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "base-tree-sha" } } });
    const createBlob = vi.fn().mockImplementation(() => ({ data: { sha: `blob-sha-${blobCounter++}` } }));
    const createTree = vi.fn().mockResolvedValue({ data: { sha: "new-tree-sha" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "commit-sha" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [
      { path: "src/index.ts", content: "code", isBinary: false },
      { path: "logo.png", content: "base64data", isBinary: true },
    ];

    const promise = commitFiles(octokit, "owner", "repo", files, "commit");
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    // All files go through createBlob
    expect(createBlob).toHaveBeenCalledTimes(2);
    // Tree items all use sha (no inline content)
    const treeCall = createTree.mock.calls[0][0];
    const textItem = treeCall.tree.find((t: { path: string }) => t.path === "src/index.ts");
    const binItem = treeCall.tree.find((t: { path: string }) => t.path === "logo.png");
    expect(textItem.sha).toBe("blob-sha-0");
    expect(textItem.content).toBeUndefined();
    expect(binItem.sha).toBe("blob-sha-1");
    expect(binItem.content).toBeUndefined();
  });

  it("creates blobs for text-only files too", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn().mockResolvedValue({ data: { sha: "tree" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(createBlob).toHaveBeenCalledTimes(1);
  });

  it("createTree strategy: attempts 0-2 include base_tree", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "base-tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn()
      .mockRejectedValueOnce(new Error("404"))
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValue({ data: { sha: "tree" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000); // waitForRef
    // Backoff for attempt 0: 3s
    await vi.advanceTimersByTimeAsync(3000);
    // Backoff for attempt 1: 6s
    await vi.advanceTimersByTimeAsync(6000);
    await promise;

    // All 3 calls should have base_tree
    expect(createTree.mock.calls[0][0].base_tree).toBe("base-tree");
    expect(createTree.mock.calls[1][0].base_tree).toBe("base-tree");
    expect(createTree.mock.calls[2][0].base_tree).toBe("base-tree");
  });

  it("createTree strategy: attempt 3 drops base_tree", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "base-tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn()
      .mockRejectedValueOnce(new Error("404")) // attempt 0
      .mockRejectedValueOnce(new Error("404")) // attempt 1
      .mockRejectedValueOnce(new Error("404")) // attempt 2
      .mockResolvedValue({ data: { sha: "tree" } }); // attempt 3
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000); // waitForRef
    // Backoffs: 3s, 6s, 12s
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(6000);
    await vi.advanceTimersByTimeAsync(12000);
    await promise;

    // Attempt 3 should NOT have base_tree
    expect(createTree.mock.calls[3][0].base_tree).toBeUndefined();
  });

  it("createTree strategy: attempts 4-7 remain without base_tree (sticky switch)", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "base-tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn()
      .mockRejectedValueOnce(new Error("fail")) // 0
      .mockRejectedValueOnce(new Error("fail")) // 1
      .mockRejectedValueOnce(new Error("fail")) // 2
      .mockRejectedValueOnce(new Error("fail")) // 3
      .mockRejectedValueOnce(new Error("fail")) // 4
      .mockResolvedValue({ data: { sha: "tree" } }); // 5
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000); // waitForRef
    // Backoffs: 3s, 6s, 12s, 15s(capped), 15s
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(6000);
    await vi.advanceTimersByTimeAsync(12000);
    await vi.advanceTimersByTimeAsync(15000);
    await vi.advanceTimersByTimeAsync(15000);
    await promise;

    // Attempts 0-2 have base_tree, attempts 3-5 don't
    expect(createTree.mock.calls[0][0].base_tree).toBe("base-tree");
    expect(createTree.mock.calls[1][0].base_tree).toBe("base-tree");
    expect(createTree.mock.calls[2][0].base_tree).toBe("base-tree");
    expect(createTree.mock.calls[3][0].base_tree).toBeUndefined();
    expect(createTree.mock.calls[4][0].base_tree).toBeUndefined();
    expect(createTree.mock.calls[5][0].base_tree).toBeUndefined();
  });

  it("throws after 8 failed createTree attempts", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn().mockRejectedValue(new Error("404 Not Found"));
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await flushAll();

    await expect(promise).rejects.toThrow("404 Not Found");
    expect(createTree).toHaveBeenCalledTimes(8);
  });

  it("exponential backoff capped at 15s on createTree", async () => {
    // Verify backoff: 3s, 6s, 12s, 15s(cap), 15s, 15s, 15s
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn().mockRejectedValue(new Error("fail"));
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await flushAll();

    await expect(promise).rejects.toThrow("fail");
    expect(createTree).toHaveBeenCalledTimes(8);
  });

  it("propagates waitForRef failure", async () => {
    const getRef = vi.fn().mockRejectedValue(new Error("ref not found"));
    const octokit = createMockOctokit({ git: { getRef } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await flushAll();

    await expect(promise).rejects.toThrow("ref not found");
  });

  it("propagates getCommit failure", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockRejectedValue(new Error("commit not found"));
    const octokit = createMockOctokit({ git: { getRef, getCommit } });

    const files = [{ path: "a.ts", content: "x", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await flushAll();

    await expect(promise).rejects.toThrow("commit not found");
  });

  it("tree items: all files use sha (no inline content)", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "blob-sha" } });
    const createTree = vi.fn().mockResolvedValue({ data: { sha: "t" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "file.ts", content: "code", isBinary: false }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    const treeItems = createTree.mock.calls[0][0].tree;
    expect(treeItems[0]).toEqual({
      path: "file.ts",
      mode: "100644",
      type: "blob",
      sha: "blob-sha",
    });
    expect(treeItems[0].content).toBeUndefined();
  });

  it("tree items: binary files have sha field, no content", async () => {
    const getRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha" } } });
    const getCommit = vi.fn().mockResolvedValue({ data: { tree: { sha: "tree" } } });
    const createBlob = vi.fn().mockResolvedValue({ data: { sha: "bin-sha" } });
    const createTree = vi.fn().mockResolvedValue({ data: { sha: "t" } });
    const createCommit = vi.fn().mockResolvedValue({ data: { sha: "c" } });
    const updateRef = vi.fn().mockResolvedValue({});
    const octokit = createMockOctokit({ git: { getRef, getCommit, createBlob, createTree, createCommit, updateRef } });

    const files = [{ path: "img.png", content: "base64", isBinary: true }];
    const promise = commitFiles(octokit, "owner", "repo", files, "msg");
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    const treeItems = createTree.mock.calls[0][0].tree;
    expect(treeItems[0]).toEqual({
      path: "img.png",
      mode: "100644",
      type: "blob",
      sha: "bin-sha",
    });
    expect(treeItems[0].content).toBeUndefined();
  });
});

describe("fetchRepoFiles", () => {
  it("uses default branch when no ref provided", async () => {
    const reposGet = vi.fn().mockResolvedValue({ data: { default_branch: "main" } });
    const getTree = vi.fn().mockResolvedValue({ data: { tree: [] } });
    const octokit = createMockOctokit({ repos: { get: reposGet }, git: { getTree } });

    await fetchRepoFiles(octokit, "owner", "repo", "");

    expect(reposGet).toHaveBeenCalledWith({ owner: "owner", repo: "repo" });
    expect(getTree).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      tree_sha: "main",
      recursive: "true",
    });
  });

  it("uses explicit ref directly (skips repos.get)", async () => {
    const reposGet = vi.fn();
    const getTree = vi.fn().mockResolvedValue({ data: { tree: [] } });
    const octokit = createMockOctokit({ repos: { get: reposGet }, git: { getTree } });

    await fetchRepoFiles(octokit, "owner", "repo", "", "develop");

    expect(reposGet).not.toHaveBeenCalled();
    expect(getTree).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      tree_sha: "develop",
      recursive: "true",
    });
  });

  it("filters tree to blobs only", async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: {
        tree: [
          { type: "blob", sha: "sha1", path: "file.ts" },
          { type: "tree", sha: "sha2", path: "src" },
          { type: "blob", sha: "sha3", path: "readme.md" },
        ],
      },
    });
    const getBlob = vi.fn().mockResolvedValue({ data: { content: Buffer.from("content").toString("base64"), size: 7 } });
    const octokit = createMockOctokit({ git: { getTree, getBlob } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "", "main");

    expect(files).toHaveLength(2);
    expect(getBlob).toHaveBeenCalledTimes(2);
  });

  it("applies subpath filter", async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: {
        tree: [
          { type: "blob", sha: "sha1", path: "src/index.ts" },
          { type: "blob", sha: "sha2", path: "docs/readme.md" },
          { type: "blob", sha: "sha3", path: "src/utils.ts" },
        ],
      },
    });
    const getBlob = vi.fn().mockResolvedValue({ data: { content: Buffer.from("x").toString("base64"), size: 1 } });
    const octokit = createMockOctokit({ git: { getTree, getBlob } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "src", "main");

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path)).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("decodes base64 for text files", async () => {
    const content = "hello world";
    const base64Content = Buffer.from(content).toString("base64");
    const getTree = vi.fn().mockResolvedValue({
      data: { tree: [{ type: "blob", sha: "sha1", path: "file.ts" }] },
    });
    const getBlob = vi.fn().mockResolvedValue({ data: { content: base64Content, size: content.length } });
    const octokit = createMockOctokit({ git: { getTree, getBlob } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "", "main");

    expect(files[0].content).toBe("hello world");
    expect(files[0].isBinary).toBe(false);
  });

  it("keeps raw base64 for binary files", async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: { tree: [{ type: "blob", sha: "sha1", path: "logo.png" }] },
    });
    const getBlob = vi.fn().mockResolvedValue({ data: { content: "iVBORw0KGgo=", size: 100 } });
    const octokit = createMockOctokit({ git: { getTree, getBlob } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "", "main");

    expect(files[0].content).toBe("iVBORw0KGgo=");
    expect(files[0].isBinary).toBe(true);
  });

  it("batches downloads in groups of 20", async () => {
    // Create 25 blobs to trigger 2 batches (20 + 5)
    const blobs = Array.from({ length: 25 }, (_, i) => ({
      type: "blob" as const,
      sha: `sha${i}`,
      path: `file${i}.ts`,
    }));
    const getTree = vi.fn().mockResolvedValue({ data: { tree: blobs } });
    const getBlob = vi.fn().mockResolvedValue({ data: { content: Buffer.from("x").toString("base64"), size: 1 } });
    const octokit = createMockOctokit({ git: { getTree, getBlob } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "", "main");

    expect(files).toHaveLength(25);
    expect(getBlob).toHaveBeenCalledTimes(25);
  });

  it("returns empty array for empty tree", async () => {
    const getTree = vi.fn().mockResolvedValue({ data: { tree: [] } });
    const octokit = createMockOctokit({ git: { getTree } });

    const files = await fetchRepoFiles(octokit, "owner", "repo", "", "main");

    expect(files).toEqual([]);
  });
});

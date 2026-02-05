"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Octokit } from "octokit";
import { encryptToken, decryptToken } from "../lib/encryption";
import { formatLogEntry } from "./lib/logger";
import { buildEventArgs } from "./pipelineEvents";
import { reportToSentry } from "./lib/sentry";
import { AuthenticationError, ExternalServiceError, ShiprightError, getUserMessage } from "./lib/errors";

export const exchangeGitHubCode = action({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthenticationError("Not authenticated");

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: args.code,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new ExternalServiceError("github", `OAuth error: ${data.error_description}`, { errorCode: data.error });
    }

    const encryptedToken = encryptToken(data.access_token);
    await ctx.runMutation(api.users.saveGitHubToken, {
      encryptedToken,
    });

    return { success: true };
  },
});

export const validateToken = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthenticationError("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) return { valid: false, reason: "no_token" };

    try {
      const accessToken = decryptToken(user.githubToken);
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      return { valid: true, username: data.login };
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        return { valid: false, reason: "expired" };
      }
      throw error;
    }
  },
});

/** Parse a template sourceUrl into owner, repo, ref, and subpath */
export function parseTemplateUrl(sourceUrl: string): {
  owner: string;
  repo: string;
  ref?: string;
  subpath: string;
} {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  // parts[0] = owner, parts[1] = repo
  // Optional: parts[2] = "tree", parts[3] = ref, parts[4..] = subpath
  const owner = parts[0];
  const repo = parts[1];

  if (parts[2] === "tree" && parts.length >= 4) {
    const ref = parts[3];
    const subpath = parts.slice(4).join("/");
    return { owner, repo, ref, subpath };
  }

  return { owner, repo, subpath: "" };
}

export const cloneTemplate = action({
  args: {
    projectId: v.id("projects"),
    templateSourceUrl: v.string(),
    newRepoName: v.string(),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "cloning_repo", status: "started" }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "started" }) });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthenticationError("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new AuthenticationError("GitHub not connected", { hasUser: !!user });

    // Atomically claim the project for repo creation (prevents race conditions)
    const claim = await ctx.runMutation(api.projects.claimForRepoCreation, { projectId: args.projectId }) as {
      claimed: boolean;
      reason?: string;
      existingRepo?: string;
    };
    if (!claim.claimed) {
      if (claim.existingRepo) {
        // Project already has a repo - return it
        const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId }) as {
          githubRepoUrl?: string;
          githubRepoFullName?: string;
        } | null;
        if (project?.githubRepoUrl && project?.githubRepoFullName) {
          console.log(`Project already has repo: ${project.githubRepoFullName}, skipping creation`);
          return { repoUrl: project.githubRepoUrl, repoFullName: project.githubRepoFullName };
        }
      }
      console.log(`Could not claim project for repo creation: ${claim.reason}`);
      throw new Error(`Cannot create repo: ${claim.reason}`);
    }
    console.log(`Claimed project for repo creation`);

    const accessToken = decryptToken(user.githubToken);
    const octokit = new Octokit({
      auth: accessToken,
      request: { timeout: 30_000 },
    });

    try {
      const { owner, repo, ref, subpath } = parseTemplateUrl(
        args.templateSourceUrl
      );

      let files: Array<{ path: string; content: string; isBinary: boolean }>;
      try {
        files = await fetchRepoFiles(octokit, owner, repo, subpath, ref);
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 404) {
          throw new ExternalServiceError("github", "Template repository not found", { owner, repo, subpath });
        }
        throw error;
      }

      if (files.length === 0) {
        throw new ExternalServiceError("github", "Template repository is empty", { owner, repo, subpath });
      }

      // Strip subpath prefix from file paths so they're relative to repo root
      if (subpath) {
        const prefix = subpath + "/";
        files = files.map((f) => ({
          ...f,
          path: f.path.startsWith(prefix)
            ? f.path.slice(prefix.length)
            : f.path,
        }));
      }

      // Create repo WITHOUT auto_init and IMMEDIATELY save it to project
      // This prevents orphan repos on retry
      let newRepo;
      try {
        const result = await octokit.rest.repos.createForAuthenticatedUser({
          name: args.newRepoName,
          private: true,
          auto_init: false, // We create initial commit ourselves
        });
        newRepo = result.data;
        console.log(`Created empty repo: ${newRepo.full_name}`);
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 422) {
          const suffix = Date.now().toString(36).slice(-4);
          const result = await octokit.rest.repos.createForAuthenticatedUser({
            name: `${args.newRepoName}-${suffix}`,
            private: true,
            auto_init: false,
          });
          newRepo = result.data;
          console.log(`Created empty repo with suffix: ${newRepo.full_name}`);
        } else {
          throw error;
        }
      }

      // Save repo URL immediately so we don't create duplicates on retry
      const repoFullName = newRepo.full_name;
      await ctx.runMutation(api.projects.updateGitHubRepo, {
        projectId: args.projectId,
        repoUrl: newRepo.html_url,
        repoFullName,
      });
      console.log(`Saved repo URL to project immediately`);

      // Small delay for GitHub backend
      console.log(`Waiting 3s for GitHub backend to stabilize...`);
      await new Promise((r) => setTimeout(r, 3000));

      console.log(`Starting commit of ${files.length} files to ${newRepo.full_name}`);
      await commitFilesInitial(
        octokit,
        newRepo.owner.login,
        newRepo.name,
        files,
        `Initial commit from Shipright template: ${repo}`
      );

      // Mark repo as ready AFTER files are committed (prevents scaffolding race)
      await ctx.runMutation(api.projects.markRepoReady, { projectId: args.projectId });
      console.log(`Marked repo as ready (files committed)`);

      const durationMs = Date.now() - startedAt;
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "cloning_repo", status: "completed", durationMs }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "completed", durationMs, metadata: { repoFullName } }) });

      return { repoUrl: newRepo.html_url, repoFullName };
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;

      // Use structured error message if available, otherwise build user-friendly message
      let userMessage: string;
      if (error instanceof ShiprightError) {
        userMessage = getUserMessage(error);
      } else if (status === 401) {
        userMessage = "GitHub token expired. Please reconnect.";
      } else {
        const raw = error instanceof Error ? error.message : String(error);
        userMessage = `Repo creation failed: ${raw.slice(0, 200)}`;
      }

      const durationMs = Date.now() - startedAt;
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "cloning_repo", status: "failed", durationMs, error: userMessage }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "failed", durationMs, error: userMessage }) });
      await reportToSentry({ message: `Clone template failed: ${userMessage}`, context: { projectId: pid, step: "cloneTemplate" } });

      await ctx.runMutation(api.projects.setRepoFailed, {
        projectId: args.projectId,
        error: userMessage,
      });

      throw error;
    }
  },
});

async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<Array<{ path: string; content: string; isBinary: boolean }>> {
  // Resolve the ref to use — default to repo's default branch
  let resolvedRef = ref;
  if (!resolvedRef) {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    resolvedRef = repoData.default_branch;
  }

  // Single API call to get the entire file tree
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: resolvedRef,
    recursive: "true",
  });

  // Filter to blobs (files) only, apply subpath filter
  const prefix = path ? path + "/" : "";
  const blobs = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.sha &&
      item.path &&
      (!prefix || item.path.startsWith(prefix))
  );

  // Download all blob contents in parallel batches
  const files: Array<{ path: string; content: string; isBinary: boolean }> = [];
  const batchSize = 20;

  for (let i = 0; i < blobs.length; i += batchSize) {
    const batch = blobs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (blob) => {
        const { data } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: blob.sha!,
        });
        const binary = isBinaryFile(blob.path!, data.size ?? 0);
        return {
          path: blob.path!,
          content: binary
            ? data.content
            : Buffer.from(data.content, "base64").toString("utf-8"),
          isBinary: binary,
        };
      })
    );
    files.push(...results);
  }

  return files;
}

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg", ".bmp", ".tiff",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm",
  ".wasm", ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

export function isBinaryFile(filename: string, size: number): boolean {
  if (size > 1024 * 1024) return true; // >1MB treat as binary
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/** Wait for auto_init commit to be available, with retries */
async function waitForRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  refName: string,
  maxRetries = 8
): Promise<string> {
  // Initial delay to let GitHub's git backend initialize
  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: refName,
      });
      return ref.object.sha;
    } catch (error: unknown) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff capped at 10s
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, i), 10_000)));
    }
  }
  throw new Error("Failed to get ref after retries");
}

/** Create a single blob with retry logic */
async function createBlobWithRetry(
  octokit: Octokit,
  owner: string,
  repo: string,
  file: { path: string; content: string; isBinary: boolean },
  maxRetries = 3
): Promise<{ path: string; sha: string }> {
  const content = file.isBinary
    ? file.content // already base64
    : Buffer.from(file.content).toString("base64");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content,
        encoding: "base64",
      });
      return { path: file.path, sha: blob.sha };
    } catch (error: unknown) {
      if (attempt === maxRetries - 1) throw error;
      // Backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error(`Failed to create blob for ${file.path}`);
}

/** Create blobs in batches to avoid overwhelming the API */
async function createBlobsBatched(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>,
  batchSize = 10
): Promise<Array<{ path: string; sha: string }>> {
  const results: Array<{ path: string; sha: string }> = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((file) => createBlobWithRetry(octokit, owner, repo, file))
    );
    results.push(...batchResults);
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < files.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>,
  message: string
) {
  console.log(`[commitFiles] Waiting for main branch ref...`);
  const parentSha = await waitForRef(octokit, owner, repo, "heads/main");
  console.log(`[commitFiles] Got parent SHA: ${parentSha}`);

  // Resolve commit SHA to tree SHA — createTree requires a tree SHA for base_tree
  console.log(`[commitFiles] Getting parent commit...`);
  const { data: parentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });
  const baseTreeSha = parentCommit.tree.sha;
  console.log(`[commitFiles] Got base tree SHA: ${baseTreeSha}`);

  console.log(`[commitFiles] Creating ${files.length} blobs...`);
  const blobs = await createBlobsBatched(octokit, owner, repo, files);
  console.log(`[commitFiles] Created ${blobs.length} blobs successfully`);

  const treeItems = blobs.map((blob) => ({
    path: blob.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: blob.sha,
  }));

  // Retry createTree — GitHub's git backend can lag behind repo creation
  // Try with base_tree first, then without if it fails (creates new tree from scratch)
  console.log(`[commitFiles] Creating tree with ${treeItems.length} items, base_tree: ${baseTreeSha}`);
  let tree;
  let useBaseTree = true;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const treeParams: {
        owner: string;
        repo: string;
        tree: typeof treeItems;
        base_tree?: string;
      } = {
        owner,
        repo,
        tree: treeItems,
      };

      // After 3 failed attempts with base_tree, try without it
      if (useBaseTree && attempt < 3) {
        treeParams.base_tree = baseTreeSha;
      } else if (attempt === 3) {
        console.log(`[commitFiles] Switching to create tree without base_tree`);
        useBaseTree = false;
      }

      const result = await octokit.rest.git.createTree(treeParams);
      tree = result.data;
      console.log(`[commitFiles] Tree created successfully: ${tree.sha}`);
      break;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt === 7) {
        console.log(`[commitFiles] createTree failed after 8 attempts: ${errMsg}`);
        throw error;
      }
      // Exponential backoff capped at 15s to avoid exceeding 600s action limit
      const delay = Math.min(3000 * Math.pow(2, attempt), 15_000);
      console.log(`[commitFiles] createTree attempt ${attempt + 1} failed (${errMsg}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (!tree) throw new Error("Failed to create git tree");

  console.log(`[commitFiles] Creating commit...`);
  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [parentSha],
  });
  console.log(`[commitFiles] Commit created: ${commit.sha}`);

  console.log(`[commitFiles] Updating ref...`);
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: commit.sha,
  });
  console.log(`[commitFiles] Done!`);
}

/** Create initial commit in an empty repo (no parent commit, no auto_init) */
async function commitFilesInitial(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>,
  message: string
) {
  // Separate binary and text files
  const binaryFiles = files.filter((f) => f.isBinary);
  const textFiles = files.filter((f) => !f.isBinary);
  console.log(`[commitFilesInitial] ${textFiles.length} text files, ${binaryFiles.length} binary files`);

  // Create blobs only for binary files (text files use inline content)
  let binaryBlobs: Array<{ path: string; sha: string }> = [];
  if (binaryFiles.length > 0) {
    console.log(`[commitFilesInitial] Creating ${binaryFiles.length} blobs for binary files...`);
    binaryBlobs = await createBlobsBatched(octokit, owner, repo, binaryFiles);
    console.log(`[commitFilesInitial] Created ${binaryBlobs.length} binary blobs`);
  }

  // Build tree items - use inline content for text files
  type TreeItem = {
    path: string;
    mode: "100644";
    type: "blob";
    content?: string;
    sha?: string;
  };

  const treeItems: TreeItem[] = [
    // Text files with inline content
    ...textFiles.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    })),
    // Binary files with blob SHA
    ...binaryBlobs.map((blob) => ({
      path: blob.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blob.sha,
    })),
  ];

  // Create tree WITHOUT base_tree (fresh tree for empty repo)
  console.log(`[commitFilesInitial] Creating tree with ${treeItems.length} items...`);
  let tree;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await octokit.rest.git.createTree({
        owner,
        repo,
        tree: treeItems,
      });
      tree = result.data;
      console.log(`[commitFilesInitial] Tree created: ${tree.sha}`);
      break;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt === 4) {
        console.log(`[commitFilesInitial] createTree failed after 5 attempts: ${errMsg}`);
        throw error;
      }
      // Cap backoff at 10s to avoid exceeding 600s action limit
      const delay = Math.min(2000 * Math.pow(2, attempt), 10_000);
      console.log(`[commitFilesInitial] createTree attempt ${attempt + 1} failed (${errMsg}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (!tree) throw new Error("Failed to create git tree");

  // Create initial commit (no parents)
  console.log(`[commitFilesInitial] Creating initial commit...`);
  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [],
  });
  console.log(`[commitFilesInitial] Commit created: ${commit.sha}`);

  // Create the main branch
  console.log(`[commitFilesInitial] Creating main branch...`);
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: "refs/heads/main",
    sha: commit.sha,
  });
  console.log(`[commitFilesInitial] Done!`);
}

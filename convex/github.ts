"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Octokit } from "octokit";
import { encryptToken, decryptToken } from "../lib/encryption";

export const exchangeGitHubCode = action({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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
      throw new Error(`GitHub OAuth error: ${data.error_description}`);
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
    if (!identity) throw new Error("Not authenticated");

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
function parseTemplateUrl(sourceUrl: string): {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new Error("GitHub not connected");

    const accessToken = decryptToken(user.githubToken);
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, ref, subpath } = parseTemplateUrl(
      args.templateSourceUrl
    );

    let files: Array<{ path: string; content: string; isBinary: boolean }>;
    try {
      files = await fetchRepoFiles(octokit, owner, repo, subpath, ref);
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new Error("TEMPLATE_UNAVAILABLE");
      }
      throw error;
    }

    if (files.length === 0) {
      throw new Error("TEMPLATE_UNAVAILABLE");
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

    let newRepo;
    try {
      const result = await octokit.rest.repos.createForAuthenticatedUser({
        name: args.newRepoName,
        private: true,
        auto_init: true,
      });
      newRepo = result.data;
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 422) {
        const suffix = Date.now().toString(36).slice(-4);
        const result = await octokit.rest.repos.createForAuthenticatedUser({
          name: `${args.newRepoName}-${suffix}`,
          private: true,
          auto_init: true,
        });
        newRepo = result.data;
      } else {
        throw error;
      }
    }

    await commitFiles(
      octokit,
      newRepo.owner.login,
      newRepo.name,
      files,
      `Initial commit from Shipright template: ${repo}`
    );

    const repoFullName = newRepo.full_name;
    await ctx.runMutation(api.projects.updateGitHubRepo, {
      projectId: args.projectId,
      repoUrl: newRepo.html_url,
      repoFullName,
    });

    return { repoUrl: newRepo.html_url, repoFullName };
  },
});

async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<Array<{ path: string; content: string; isBinary: boolean }>> {
  const { data: contents } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ...(ref ? { ref } : {}),
  });

  const files: Array<{ path: string; content: string; isBinary: boolean }> = [];
  const items = Array.isArray(contents) ? contents : [contents];

  for (const item of items) {
    if (item.type === "file" && item.download_url) {
      try {
        const response = await fetch(item.download_url);
        if (!response.ok) continue; // skip files that fail to download

        const isBinary = isBinaryFile(item.name, item.size ?? 0);

        if (isBinary) {
          const buffer = await response.arrayBuffer();
          files.push({
            path: item.path,
            content: Buffer.from(buffer).toString("base64"),
            isBinary: true,
          });
        } else {
          const content = await response.text();
          files.push({ path: item.path, content, isBinary: false });
        }
      } catch {
        // Skip files that fail to download
        continue;
      }
    } else if (item.type === "dir") {
      const subFiles = await fetchRepoFiles(octokit, owner, repo, item.path, ref);
      files.push(...subFiles);
    }
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

function isBinaryFile(filename: string, size: number): boolean {
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
  maxRetries = 5
): Promise<string> {
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
      // Wait with exponential backoff: 500ms, 1s, 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to get ref after retries");
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
      batch.map(async (file) => {
        const content = file.isBinary
          ? file.content // already base64
          : Buffer.from(file.content).toString("base64");

        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content,
          encoding: "base64",
        });
        return { path: file.path, sha: blob.sha };
      })
    );
    results.push(...batchResults);
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
  const parentSha = await waitForRef(octokit, owner, repo, "heads/main");

  // Get the tree SHA from the parent commit for base_tree
  const { data: parentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const blobs = await createBlobsBatched(octokit, owner, repo, files);

  const treeItems = blobs.map((blob) => ({
    path: blob.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: blob.sha,
  }));

  // Retry createTree — GitHub's git backend can lag behind repo creation
  let tree;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: parentCommit.tree.sha,
        tree: treeItems,
      });
      tree = result.data;
      break;
    } catch (error: unknown) {
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  if (!tree) throw new Error("Failed to create git tree");

  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [parentSha],
  });

  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: commit.sha,
  });
}

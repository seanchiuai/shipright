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

export const cloneTemplate = action({
  args: {
    projectId: v.id("projects"),
    templateRepoFullName: v.string(),
    newRepoName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new Error("GitHub not connected");

    const accessToken = decryptToken(user.githubToken);
    const octokit = new Octokit({ auth: accessToken });

    const [templateOwner, templateRepo] =
      args.templateRepoFullName.split("/");

    let files: Array<{ path: string; content: string }>;
    try {
      files = await fetchRepoFiles(octokit, templateOwner, templateRepo);
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new Error("TEMPLATE_UNAVAILABLE");
      }
      throw error;
    }

    let newRepo;
    try {
      const result = await octokit.rest.repos.createForAuthenticatedUser({
        name: args.newRepoName,
        private: true,
        auto_init: false,
      });
      newRepo = result.data;
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 422) {
        const suffix = Date.now().toString(36).slice(-4);
        const result = await octokit.rest.repos.createForAuthenticatedUser({
          name: `${args.newRepoName}-${suffix}`,
          private: true,
          auto_init: false,
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
      `Initial commit from Shipright template: ${templateRepo}`
    );

    await ctx.runMutation(api.projects.updateGitHubRepo, {
      projectId: args.projectId,
      repoUrl: newRepo.html_url,
      repoFullName: newRepo.full_name,
    });

    return { repoUrl: newRepo.html_url, repoFullName: newRepo.full_name };
  },
});

async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ""
): Promise<Array<{ path: string; content: string }>> {
  const { data: contents } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  const files: Array<{ path: string; content: string }> = [];
  const items = Array.isArray(contents) ? contents : [contents];

  for (const item of items) {
    if (item.type === "file" && item.download_url) {
      const response = await fetch(item.download_url);
      const content = await response.text();
      files.push({ path: item.path, content });
    } else if (item.type === "dir") {
      const subFiles = await fetchRepoFiles(octokit, owner, repo, item.path);
      files.push(...subFiles);
    }
  }

  return files;
}

async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  message: string
) {
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      return { path: file.path, sha: blob.sha };
    })
  );

  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: blobs.map((blob) => ({
      path: blob.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blob.sha,
    })),
  });

  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: "refs/heads/main",
    sha: commit.sha,
  });
}

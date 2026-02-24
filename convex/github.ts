"use node";
// [DEACTIVATED] Pipeline v1 — GitHub/Daytona/scaffolding flow. Kept for backward compat.

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Octokit } from "octokit";
import { encryptToken, decryptToken, TokenDecryptionError } from "../lib/encryption";
import { formatLogEntry } from "./lib/logger";
import { buildEventArgs } from "./pipelineEvents";
import { reportToSentry } from "./lib/sentry";
import { AuthenticationError, ExternalServiceError, ShiprightError, getUserMessage } from "./lib/errors";
import { fetchRepoFiles, commitFiles } from "./lib/git_operations";

export { isBinaryFile } from "./lib/git_operations";

export const exchangeGitHubCode = action({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    console.log(`[github.exchangeGitHubCode] started`);
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
      console.log(`[github.exchangeGitHubCode] failed error=${data.error}`);
      await reportToSentry({ message: `GitHub OAuth exchange failed: ${data.error_description}`, context: { errorCode: data.error } });
      throw new ExternalServiceError("github", `OAuth error: ${data.error_description}`, { errorCode: data.error });
    }

    try {
      const encryptedToken = encryptToken(data.access_token);
      await ctx.runMutation(api.users.saveGitHubToken, {
        encryptedToken,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await reportToSentry({ message: `GitHub token save failed: ${msg}`, context: { step: "saveGitHubToken" } });
      throw error;
    }

    console.log(`[github.exchangeGitHubCode] success`);
    return { success: true };
  },
});

export const validateToken = action({
  args: {},
  handler: async (ctx) => {
    console.log(`[github.validateToken] started`);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthenticationError("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) {
      console.log(`[github.validateToken] result=no_token`);
      return { valid: false, reason: "no_token" };
    }

    try {
      const accessToken = decryptToken(user.githubToken);
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      console.log(`[github.validateToken] result=valid username=${data.login}`);
      return { valid: true, username: data.login };
    } catch (error: unknown) {
      if (error instanceof TokenDecryptionError) {
        console.log(`[github.validateToken] result=token_corrupted`);
        await reportToSentry({ message: "GitHub token decryption failed (corrupted)", context: { step: "validateToken" } });
        return { valid: false, reason: "expired" };
      }
      const status = (error as { status?: number }).status;
      if (status === 401) {
        console.log(`[github.validateToken] result=expired`);
        return { valid: false, reason: "expired" };
      }
      const msg = error instanceof Error ? error.message : String(error);
      await reportToSentry({ message: `GitHub token validation failed: ${msg}`, context: { step: "validateToken", status } });
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
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "started" }) });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthenticationError("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new AuthenticationError("GitHub not connected", { hasUser: !!user });

    // Atomically claim the project for repo creation (prevents race conditions)
    const claim = await ctx.runMutation(internal.projects.claimForRepoCreation, { projectId: args.projectId }) as {
      claimed: boolean;
      reason?: string;
      existingRepo?: string;
    };
    if (!claim.claimed) {
      if (claim.existingRepo) {
        // Project already has a repo - return it
        const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId }) as {
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
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "fetch_template", status: "started", templateOwner: owner, templateRepo: repo, ref: ref || "(default)", subpath: subpath || "(root)" }));

      let files: Array<{ path: string; content: string; isBinary: boolean }>;
      const fetchStart = Date.now();
      try {
        files = await fetchRepoFiles(octokit, owner, repo, subpath, ref);
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 404) {
          throw new ExternalServiceError("github", "Template repository not found", { owner, repo, subpath });
        }
        throw error;
      }
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "fetch_template", status: "completed", fileCount: files.length, durationMs: Date.now() - fetchStart }));

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

      // Create repo WITH auto_init so GitHub initializes the git backend.
      // Without an initial commit, GitHub's Git Database API (createBlob, createTree)
      // rejects all calls with "Git Repository is empty".
      let newRepo;
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "create_repo", status: "started", repoName: args.newRepoName }));
      const createRepoStart = Date.now();
      try {
        const result = await octokit.rest.repos.createForAuthenticatedUser({
          name: args.newRepoName,
          private: true,
          auto_init: true,
        });
        newRepo = result.data;
        console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "create_repo", status: "completed", repoFullName: newRepo.full_name, durationMs: Date.now() - createRepoStart }));
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 422) {
          const suffix = Date.now().toString(36).slice(-4);
          const fallbackName = `${args.newRepoName}-${suffix}`;
          console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "create_repo", status: "name_conflict", fallbackName }));
          const result = await octokit.rest.repos.createForAuthenticatedUser({
            name: fallbackName,
            private: true,
            auto_init: true,
          });
          newRepo = result.data;
          console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "create_repo", status: "completed", repoFullName: newRepo.full_name, durationMs: Date.now() - createRepoStart }));
        } else {
          throw error;
        }
      }

      // Save repo URL immediately so we don't create duplicates on retry
      const repoFullName = newRepo.full_name;
      await ctx.runMutation(internal.projects.updateGitHubRepo, {
        projectId: args.projectId,
        repoUrl: newRepo.html_url,
        repoFullName,
      });
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "save_repo_url", status: "completed", repoFullName }));

      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "commit_files", status: "started", fileCount: files.length, targetRepo: repoFullName }));
      const commitStart = Date.now();
      await commitFiles(
        octokit,
        newRepo.owner.login,
        newRepo.name,
        files,
        `Initial commit from Shipright template: ${repo}`
      );
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "commit_files", status: "completed", fileCount: files.length, durationMs: Date.now() - commitStart }));

      // Mark repo as ready AFTER files are committed (prevents scaffolding race)
      await ctx.runMutation(internal.projects.markRepoReady, { projectId: args.projectId });
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "mark_repo_ready", status: "completed" }));

      const durationMs = Date.now() - startedAt;
      console.log(formatLogEntry({ action: "cloneTemplate", projectId: pid, step: "cloning_repo", status: "completed", durationMs }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "completed", durationMs, metadata: { repoFullName } }) });

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
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "cloning_repo", status: "failed", durationMs, error: userMessage }) });
      await reportToSentry({ message: `Clone template failed: ${userMessage}`, context: { projectId: pid, step: "cloneTemplate" } });

      await ctx.runMutation(api.projects.setRepoFailed, {
        projectId: args.projectId,
        error: userMessage,
      });

      throw error;
    }
  },
});


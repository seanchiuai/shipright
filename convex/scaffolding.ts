"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { api, internal } from "./_generated/api";
import { Daytona } from "@daytonaio/sdk";
import { decryptToken } from "../lib/encryption";
import { getVertexProvider } from "./lib/vertex";
import {
  PRD_GENERATION_PROMPT,
  TECH_STACK_RESEARCH_PROMPT,
} from "../prompts";
import { Octokit } from "octokit";
import { formatLogEntry } from "./lib/logger";
import { buildEventArgs } from "./pipelineEvents";
import { reportToSentry } from "./lib/sentry";
import { validateRepoAccess, parseRepoFullName } from "./lib/github";
import {
  buildSandboxCredentials,
  provisionSandboxCredentials,
  validateCredentialsAvailable,
} from "./lib/credentials";
import { withRetry, GITHUB_RETRY_CONFIG, DAYTONA_RETRY_CONFIG } from "./lib/retry";
import {
  PipelineError,
  ExternalServiceError,
  NotFoundError,
  getUserMessage,
  wrapError,
} from "./lib/errors";
import { parseJsonResponse } from "./lib/json";

// Step 1: Generate PRD markdown from interview requirements
export const generatePrd = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ prdMarkdown: string }> => {
    const startedAt = Date.now();
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "started" }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "generating_prd", status: "started" }) });

    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project?.requirements) throw new Error("Project has no requirements");

    const vertex = getVertexProvider();
    const result = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: PRD_GENERATION_PROMPT,
      prompt: JSON.stringify(project.requirements),
    });

    await ctx.runMutation(api.projects.savePrdMarkdown, {
      projectId: args.projectId,
      prdMarkdown: result.text,
    });

    const durationMs = Date.now() - startedAt;
    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "completed", durationMs }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "generating_prd", status: "completed", durationMs }) });

    return { prdMarkdown: result.text };
  },
});

// Step 2: Research tech stack integrations beyond base template
export const researchTechStack = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "researchTechStack", projectId: pid, step: "researching_stack", status: "started" }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "researching_stack", status: "started" }) });

    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project?.templateId) throw new Error("Project has no template");

    const templates = await ctx.runQuery(api.templates.list, {});
    const template = templates.find((t: { _id: string }) => t._id === project.templateId);
    if (!template) throw new Error("Template not found");

    const vertex = getVertexProvider();
    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: TECH_STACK_RESEARCH_PROMPT,
      prompt: JSON.stringify({
        requirements: project.requirements,
        templateStack: template.stack,
        templateCapabilities: template.capabilities,
        gaps: project.matchGaps || [],
      }),
    });

    const techStack = parseJsonResponse(text) as {
      resolved: Array<{ need: string; library: string; package: string; reason: string }>;
      choices: Array<{ need: string; options: Array<{ library: string; package: string; reason: string }> }>;
    };

    await ctx.runMutation(api.projects.saveTechStackResearch, {
      projectId: args.projectId,
      techStackResearch: techStack,
    });

    const durationMs = Date.now() - startedAt;
    console.log(formatLogEntry({ action: "researchTechStack", projectId: pid, step: "researching_stack", status: "completed", durationMs }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "researching_stack", status: "completed", durationMs, metadata: { resolvedCount: techStack.resolved?.length ?? 0, choicesCount: techStack.choices?.length ?? 0 } }) });

    // If choices exist, pause for user input
    if (techStack.choices?.length > 0) {
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "awaiting_tech_choices",
      });
    } else {
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "preparing_sandbox",
      });
    }

    return techStack;
  },
});

// Step 2b: User submits tech choices (called from UI)
export const submitTechChoices = action({
  args: {
    projectId: v.id("projects"),
    choices: v.any(), // Record<string, string> - need -> chosen library
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.projects.submitTechChoices, {
      projectId: args.projectId,
      techStackChoices: args.choices,
    });
  },
});

// Pipeline orchestrator: Steps 1-2, then sandbox if no choices needed
export const runScaffoldingPipeline = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project) throw new Error("Project not found");

    // Update project status to scaffolding
    await ctx.runMutation(api.projects.updateStatus, {
      projectId: args.projectId,
      status: "scaffolding",
    });

    try {
      // Step 1: Generate PRD (skip if already done)
      if (!project.prdMarkdown) {
        await ctx.runMutation(api.projects.updateScaffoldingStatus, {
          projectId: args.projectId,
          scaffoldingStatus: "generating_prd",
        });
        await ctx.runAction(api.scaffolding.generatePrd, { projectId: args.projectId });
      }

      // Step 2: Research tech stack (skip if already done)
      if (!project.techStackResearch) {
        await ctx.runMutation(api.projects.updateScaffoldingStatus, {
          projectId: args.projectId,
          scaffoldingStatus: "researching_stack",
        });
        await ctx.runAction(api.scaffolding.researchTechStack, { projectId: args.projectId });
      }

      // Check if we need user choices
      const updated = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
      if (updated?.scaffoldingStatus === "awaiting_tech_choices") {
        return; // UI will call resumeAfterChoices when user picks
      }

      // No choices needed — schedule sandbox as independent action (avoids Convex action timeout)
      await ctx.scheduler.runAfter(0, api.scaffolding.executeSandbox, { projectId: args.projectId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown scaffolding error";
      await reportToSentry({ message: `Scaffolding pipeline failed: ${message}`, context: { projectId: args.projectId, step: "runScaffoldingPipeline" } });
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: message,
      });
      throw error;
    }
  },
});

// Resume pipeline after user makes tech choices
export const resumeAfterChoices = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Schedule sandbox as independent action (avoids Convex action timeout)
    await ctx.scheduler.runAfter(0, api.scaffolding.executeSandbox, { projectId: args.projectId });
  },
});

// Build the prompt that Claude Code will use in the sandbox
export function buildSandboxPrompt(params: {
  prdMarkdown: string;
  techStackResolved: Array<{ need: string; library: string; package: string; reason: string }>;
  techStackChoices: Record<string, string> | null;
  requirements: unknown;
  templateName: string;
  templateStack: string[];
  matchGaps: string[];
}): string {
  const allIntegrations = [
    ...params.techStackResolved.map((r) => `- ${r.need}: ${r.library} (${r.package}) — ${r.reason}`),
    ...(params.techStackChoices
      ? Object.entries(params.techStackChoices).map(([need, lib]) => `- ${need}: ${lib} (user-chosen)`)
      : []),
  ];

  return `## Project Context

### Generated PRD
${params.prdMarkdown}

### Tech Stack
Base template: ${params.templateName} (${params.templateStack.join(", ")})
Template gaps: ${params.matchGaps.join(", ") || "None"}

Resolved integrations:
${allIntegrations.length > 0 ? allIntegrations.join("\n") : "None — template covers all needs."}

### Raw Requirements
${JSON.stringify(params.requirements, null, 2)}

---

## Instructions

Fill in each template file ONE BY ONE in this exact order:

1. docs/PRD.md - Use the Generated PRD above. Adapt to the template format with {{PLACEHOLDER}} markers.
2. docs/design.md - Create UI specs based on PRD features and user flows.
3. template-CLAUDE.md - Fill in project details, then rename to CLAUDE.md.
4. TASKS.md - Create tasks referencing user stories from PRD.
5. docs/development-progress.yaml - Define phases matching CLAUDE.md.
6. prompts/phase-1.md - Phase 1 prompt referencing user stories and skills.
7. .claude/skills/ - Generate domain-specific skills for each integration.

For each file:
- Read the template first to understand the {{PLACEHOLDER}} format
- Fill in every placeholder with project-specific content
- Do NOT leave any {{PLACEHOLDER}} unfilled
- Write content appropriate for the user's specific app idea

After all files are complete, do a final review pass.`;
}

// Step 3: Create sandbox, setup files, launch Claude Code async
export const executeSandbox = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "preparing_sandbox", status: "started" }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "preparing_sandbox", status: "started" }) });

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    });

    try {
      // Validate project exists and has required data
      const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
      if (!project) throw new NotFoundError("Project", args.projectId);
      if (!project.githubRepoFullName) throw new PipelineError("sandbox_setup", "No GitHub repo linked to project");
      if (!project.prdMarkdown) throw new PipelineError("sandbox_setup", "PRD not generated");

      // Get and validate user credentials
      const user = await ctx.runQuery(internal.users.getById, { userId: project.userId });
      if (!user?.githubToken) throw new PipelineError("sandbox_setup", "GitHub not connected");
      const githubToken = decryptToken(user.githubToken);

      // Validate credentials are available BEFORE creating sandbox
      validateCredentialsAvailable(githubToken);

      // Validate repo access with retry
      const repoParsed = parseRepoFullName(project.githubRepoFullName);
      if (!repoParsed) throw new PipelineError("sandbox_setup", "Invalid repo name format");
      const octokit = new Octokit({ auth: githubToken });

      const repoCheck = await withRetry(
        () => validateRepoAccess(octokit, repoParsed.owner, repoParsed.repo),
        GITHUB_RETRY_CONFIG,
        { operation: "validateRepoAccess", repo: project.githubRepoFullName },
      );

      if (!repoCheck.accessible) {
        throw new ExternalServiceError("github", repoCheck.message, { repo: project.githubRepoFullName });
      }

      // Build prompt for Claude Code
      const templates = await ctx.runQuery(api.templates.list, {});
      const template = templates.find((t: { _id: string }) => t._id === project.templateId);
      const techStack = (project.techStackResearch as {
        resolved: Array<{ need: string; library: string; package: string; reason: string }>;
      }) || { resolved: [] };

      const prompt = buildSandboxPrompt({
        prdMarkdown: project.prdMarkdown,
        techStackResolved: techStack.resolved || [],
        techStackChoices: (project.techStackChoices as Record<string, string>) || null,
        requirements: project.requirements,
        templateName: project.templateName || "Unknown",
        templateStack: template?.stack || [],
        matchGaps: project.matchGaps || [],
      });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "preparing_sandbox",
      });

      // Create sandbox with retry (NOT ephemeral — persists across actions)
      const sandbox = await withRetry(
        () => daytona.create({
          language: "typescript",
          autoStopInterval: 30,
          envVars: { GITHUB_TOKEN: githubToken },
          labels: { project: "shipright", projectId: args.projectId },
        }, { timeout: 120 }),
        DAYTONA_RETRY_CONFIG,
        { operation: "daytona.create", projectId: pid },
      );

      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "sandbox_created", status: "completed", sandboxId: sandbox.id }));

      // Provision all credentials using unified credential manager
      const credentials = buildSandboxCredentials(githubToken);
      await provisionSandboxCredentials(sandbox, credentials);

      // Clone repos and copy template files
      await sandbox.git.clone(
        `https://github.com/${project.githubRepoFullName}.git`,
        "project",
        undefined, undefined,
        "x-access-token", githubToken,
      );
      await sandbox.git.clone("https://github.com/seanchiuai/cc-template.git", "cc-template");
      await sandbox.process.executeCommand("cp -r cc-template/.claude project/");
      await sandbox.process.executeCommand(
        "cp cc-template/template-CLAUDE.md project/ && " +
        "cp cc-template/TASKS.md project/ && " +
        "mkdir -p project/docs project/prompts && " +
        "cp cc-template/docs/PRD.md project/docs/ && " +
        "cp cc-template/docs/design.md project/docs/ && " +
        "cp cc-template/docs/development-progress.yaml project/docs/ && " +
        "cp cc-template/prompts/phase-1.md project/prompts/",
      );
      await sandbox.fs.uploadFile(Buffer.from(prompt, "utf-8"), "prompt.txt");

      // Configure git identity for commits in project dir
      await sandbox.process.executeCommand(
        'git config user.name "Shipright" && git config user.email "bot@shipright.dev"',
        "project",
      );

      // Install Claude Code CLI
      await sandbox.process.executeCommand("npm install -g @anthropic-ai/claude-code", undefined, undefined, 90);

      // Write launcher script (avoids complex shell quoting issues with nohup)
      const homeResult = await sandbox.process.executeCommand("echo $HOME");
      const homeDir = (homeResult.result || "").trim() || "/home/daytona";
      const launcherScript = `#!/bin/bash
cd /home/daytona/project
claude -p "$(cat /home/daytona/prompt.txt)" --model claude-sonnet-4-20250514 --permission-mode bypassPermissions > /tmp/claude_output.txt 2>&1
echo $? > /tmp/claude_exit_code
`;
      await sandbox.fs.uploadFile(Buffer.from(launcherScript, "utf-8"), `${homeDir}/run_claude.sh`);
      await sandbox.process.executeCommand("chmod +x ~/run_claude.sh");

      // Launch as background process
      await sandbox.process.executeCommand("nohup ~/run_claude.sh > /dev/null 2>&1 &");

      // Save sandbox ID so pollSandbox can reconnect
      await ctx.runMutation(api.projects.saveSandboxInfo, {
        projectId: args.projectId,
        sandboxId: sandbox.id,
        sandboxSessionId: "nohup",
        sandboxCommandId: "nohup",
      });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "running_sandbox",
      });
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "running_sandbox", status: "started" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "started" }) });

      // Schedule polling action to check completion (start checking after 60s)
      await ctx.scheduler.runAfter(60000, api.scaffolding.pollSandbox, { projectId: args.projectId });
    } catch (error: unknown) {
      const wrapped = wrapError(error, "sandbox_setup", { projectId: pid });
      const userMessage = getUserMessage(wrapped);

      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }) });
      await reportToSentry({ message: wrapped.message, context: { projectId: pid, step: "sandbox_setup" } });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: userMessage,
      });
    }
  },
});

// Step 4: Poll sandbox for Claude Code completion, then push
export const pollSandbox = action({
  args: { projectId: v.id("projects"), pollCount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const pid = args.projectId;
    const count = args.pollCount || 0;
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project || !project.sandboxId || !project.sandboxSessionId) {
      throw new PipelineError("sandbox_poll", "No sandbox info found", { projectId: pid });
    }

    // Bail if already completed or failed
    if (project.scaffoldingStatus === "scaffolding_complete" || project.scaffoldingStatus === "scaffolding_failed") {
      return;
    }

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    });

    let sandbox: Awaited<ReturnType<typeof daytona.get>> | undefined;
    try {
      // Reconnect to sandbox with retry
      sandbox = await withRetry(
        () => daytona.get(project.sandboxId!),
        DAYTONA_RETRY_CONFIG,
        { operation: "daytona.get", sandboxId: project.sandboxId },
      );

      // Check if Claude Code finished by looking for the exit code file
      const checkResult = await sandbox.process.executeCommand('cat /tmp/claude_exit_code 2>/dev/null || echo "RUNNING"');
      const exitCodeStr = (checkResult.result || "").trim();

      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "running_sandbox", status: "checking", pollCount: count, exitCode: exitCodeStr }));

      if (exitCodeStr === "RUNNING" || exitCodeStr === "") {
        // Log output every 5 polls for debugging
        if (count % 5 === 4) {
          try {
            const output = await sandbox.process.executeCommand('tail -20 /tmp/claude_output.txt 2>/dev/null || echo "(no output yet)"');
            console.log(`[pollSandbox] Claude output (tail 20): ${(output.result || "").slice(-500)}`);
          } catch { /* ignore */ }
        }
        // Timeout after 40 polls (~20 min)
        if (count >= 40) {
          try {
            const output = await sandbox.process.executeCommand('tail -50 /tmp/claude_output.txt 2>/dev/null');
            console.log(`[pollSandbox] TIMEOUT - Claude output: ${(output.result || "").slice(-1000)}`);
          } catch { /* ignore */ }
          throw new ExternalServiceError("anthropic", "Claude Code timed out after 20 minutes", { pollCount: count });
        }
        // Re-schedule poll in 30s
        await ctx.scheduler.runAfter(30000, api.scaffolding.pollSandbox, { projectId: args.projectId, pollCount: count + 1 });
        return;
      }

      const exitCode = parseInt(exitCodeStr, 10);
      if (exitCode !== 0) {
        const output = await sandbox.process.executeCommand('tail -30 /tmp/claude_output.txt 2>/dev/null');
        throw new ExternalServiceError("anthropic", `Claude Code failed (exit ${exitCode}): ${(output.result || "").slice(0, 500)}`, { exitCode });
      }

      // Claude Code completed successfully — commit and push
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "running_sandbox", status: "completed" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "completed" }) });

      // Get user's GitHub token for push validation
      const user = await ctx.runQuery(internal.users.getById, { userId: project.userId });
      if (!user?.githubToken) throw new PipelineError("sandbox_poll", "GitHub not connected");
      const githubToken = decryptToken(user.githubToken);
      const repoParsed = parseRepoFullName(project.githubRepoFullName!);
      if (!repoParsed) throw new PipelineError("sandbox_poll", "Invalid repo name");
      const octokit = new Octokit({ auth: githubToken });

      // Validate repo still exists with retry
      const prePushCheck = await withRetry(
        () => validateRepoAccess(octokit, repoParsed.owner, repoParsed.repo),
        GITHUB_RETRY_CONFIG,
        { operation: "validateRepoAccess", repo: project.githubRepoFullName },
      );
      if (!prePushCheck.accessible) {
        throw new ExternalServiceError("github", `Repo unavailable before push: ${prePushCheck.message}`, { repo: project.githubRepoFullName });
      }

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "pushing_files",
      });
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "pushing_files", status: "started" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "pushing_files", status: "started" }) });

      // Git commit and push with retry for transient failures
      const pushResult = await withRetry(
        async () => {
          const result = await sandbox!.process.executeCommand(
            'cd project && git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main',
            undefined, undefined, 60,
          );
          if (result.exitCode !== 0) {
            throw new Error(`Git push failed: ${result.result?.slice(0, 500)}`);
          }
          return result;
        },
        { ...GITHUB_RETRY_CONFIG, maxAttempts: 3 },
        { operation: "git_push", repo: project.githubRepoFullName },
      );

      // Success!
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_complete",
      });
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "scaffolding_complete", status: "completed" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_complete", status: "completed" }) });

    } catch (error: unknown) {
      const wrapped = wrapError(error, "sandbox_poll", { projectId: pid, pollCount: count });
      const userMessage = getUserMessage(wrapped);

      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }) });
      await reportToSentry({ message: wrapped.message, context: { projectId: pid, step: "sandbox_poll", pollCount: count } });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: userMessage,
      });
    } finally {
      // Cleanup sandbox on completion (success or failure)
      // Re-check current status to avoid deleting sandbox while still polling
      if (sandbox) {
        const current = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
        const done = current?.scaffoldingStatus === "scaffolding_complete" || current?.scaffoldingStatus === "scaffolding_failed";
        if (done) {
          try { await daytona.delete(sandbox); } catch { /* best-effort */ }
        }
      }
    }
  },
});

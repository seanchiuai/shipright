"use node";
// [DEACTIVATED] Pipeline v1 — GitHub/Daytona/scaffolding flow. Kept for backward compat.

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

/** Polling configuration for sandbox completion checks */
export const POLLING_CONFIG = {
  initialDelayMs: 60_000,
  intervalMs: 30_000,
  maxAttempts: 40,
  timeoutMinutes: 20,
} as const;

/** Timeout configuration for sandbox operations (seconds) */
export const SANDBOX_TIMEOUTS = {
  createSandbox: 120,
  npmInstall: 90,
  gitPush: 60,
} as const;

/** Claude Code model configuration */
const CLAUDE_CODE_CONFIG = {
  model: "claude-sonnet-4-20250514",
  permissionMode: "bypassPermissions",
} as const;

/** Setup sandbox: clone repos, copy template files, configure git */
async function setupSandboxEnvironment(
  sandbox: Awaited<ReturnType<Daytona["create"]>>,
  repoFullName: string,
  githubToken: string,
  prompt: string,
): Promise<void> {
  const setupStart = Date.now();

  console.log(`[setupSandbox] cloning user repo: ${repoFullName}`);
  const cloneStart = Date.now();
  await sandbox.git.clone(`https://github.com/${repoFullName}.git`, "project", undefined, undefined, "x-access-token", githubToken);
  console.log(`[setupSandbox] user repo cloned in ${Date.now() - cloneStart}ms`);

  console.log(`[setupSandbox] cloning cc-template`);
  const ccStart = Date.now();
  await sandbox.git.clone("https://github.com/seanchiuai/cc-template.git", "cc-template");
  console.log(`[setupSandbox] cc-template cloned in ${Date.now() - ccStart}ms`);

  console.log(`[setupSandbox] copying template files to project`);
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

  console.log(`[setupSandbox] uploading prompt (${prompt.length} chars)`);
  await sandbox.fs.uploadFile(Buffer.from(prompt, "utf-8"), "prompt.txt");
  await sandbox.process.executeCommand('git config user.name "Shipright" && git config user.email "bot@shipright.dev"', "project");

  console.log(`[setupSandbox] environment setup complete in ${Date.now() - setupStart}ms`);
}

/** Install Claude Code CLI and launch as background process */
async function launchClaudeCodeProcess(sandbox: Awaited<ReturnType<Daytona["create"]>>): Promise<void> {
  console.log(`[launchClaude] installing Claude Code CLI...`);
  const installStart = Date.now();
  await sandbox.process.executeCommand("npm install -g @anthropic-ai/claude-code", undefined, undefined, SANDBOX_TIMEOUTS.npmInstall);
  console.log(`[launchClaude] CLI installed in ${Date.now() - installStart}ms`);

  const homeResult = await sandbox.process.executeCommand("echo $HOME");
  const homeDir = (homeResult.result || "").trim() || "/home/daytona";
  console.log(`[launchClaude] home dir: ${homeDir}`);

  const launcherScript = `#!/bin/bash
cd /home/daytona/project
claude -p "$(cat /home/daytona/prompt.txt)" --model ${CLAUDE_CODE_CONFIG.model} --permission-mode ${CLAUDE_CODE_CONFIG.permissionMode} > /tmp/claude_output.txt 2>&1
echo $? > /tmp/claude_exit_code
`;
  await sandbox.fs.uploadFile(Buffer.from(launcherScript, "utf-8"), `${homeDir}/run_claude.sh`);
  await sandbox.process.executeCommand("chmod +x ~/run_claude.sh");
  await sandbox.process.executeCommand("nohup ~/run_claude.sh > /dev/null 2>&1 &");
  console.log(`[launchClaude] Claude Code launched (model=${CLAUDE_CODE_CONFIG.model}, mode=${CLAUDE_CODE_CONFIG.permissionMode})`);
}

// Step 1: Generate PRD markdown from interview requirements
export const generatePrd = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ prdMarkdown: string }> => {
    const startedAt = Date.now();
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "started" }));
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "generating_prd", status: "started" }) });

    const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
    if (!project?.requirements) throw new Error("Project has no requirements");

    const reqJson = JSON.stringify(project.requirements);
    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "calling_ai", inputLength: reqJson.length }));

    const vertex = getVertexProvider();
    const result = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: PRD_GENERATION_PROMPT,
      prompt: reqJson,
    });

    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "ai_complete", outputLength: result.text.length, usage: JSON.stringify(result.usage) }));

    await ctx.runMutation(internal.projects.savePrdMarkdown, {
      projectId: args.projectId,
      prdMarkdown: result.text,
    });

    const durationMs = Date.now() - startedAt;
    console.log(formatLogEntry({ action: "generatePrd", projectId: pid, step: "generating_prd", status: "completed", durationMs }));
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "generating_prd", status: "completed", durationMs }) });

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
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "researching_stack", status: "started" }) });

    const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
    if (!project?.templateId) throw new Error("Project has no template");

    const templates = await ctx.runQuery(api.templates.list, {});
    const template = templates.find((t: { _id: string }) => t._id === project.templateId);
    if (!template) throw new Error("Template not found");

    const vertex = getVertexProvider();
    const researchInput = JSON.stringify({
      requirements: project.requirements,
      templateStack: template.stack,
      templateCapabilities: template.capabilities,
      gaps: project.matchGaps || [],
    });
    console.log(formatLogEntry({ action: "researchTechStack", projectId: pid, step: "researching_stack", status: "calling_ai", inputLength: researchInput.length, gapCount: (project.matchGaps || []).length }));

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: TECH_STACK_RESEARCH_PROMPT,
      prompt: researchInput,
    });

    console.log(formatLogEntry({ action: "researchTechStack", projectId: pid, step: "researching_stack", status: "ai_complete", outputLength: text.length }));

    const techStack = parseJsonResponse(text) as {
      resolved: Array<{ need: string; library: string; package: string; reason: string }>;
      choices: Array<{ need: string; options: Array<{ library: string; package: string; reason: string }> }>;
    };

    await ctx.runMutation(internal.projects.saveTechStackResearch, {
      projectId: args.projectId,
      techStackResearch: techStack,
    });

    const durationMs = Date.now() - startedAt;
    console.log(formatLogEntry({ action: "researchTechStack", projectId: pid, step: "researching_stack", status: "completed", durationMs }));
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "researching_stack", status: "completed", durationMs, metadata: { resolvedCount: techStack.resolved?.length ?? 0, choicesCount: techStack.choices?.length ?? 0 } }) });

    // If choices exist, pause for user input
    if (techStack.choices?.length > 0) {
      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "awaiting_tech_choices",
      });
    } else {
      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
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
    console.log(formatLogEntry({ action: "submitTechChoices", projectId: args.projectId, step: "tech_choices", status: "submitted" }));
    await ctx.runMutation(internal.projects.submitTechChoices, {
      projectId: args.projectId,
      techStackChoices: args.choices,
    });
  },
});

// Pipeline orchestrator: Steps 1-2, then sandbox if no choices needed
export const runScaffoldingPipeline = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "pipeline", status: "started" }));

    const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
    if (!project) throw new Error("Project not found");

    // Update project status to scaffolding
    await ctx.runMutation(api.projects.updateStatus, {
      projectId: args.projectId,
      status: "scaffolding",
    });

    try {
      // Step 1: Generate PRD (skip if already done)
      if (!project.prdMarkdown) {
        console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "generating_prd", status: "running" }));
        await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
          projectId: args.projectId,
          scaffoldingStatus: "generating_prd",
        });
        await ctx.runAction(api.scaffolding.generatePrd, { projectId: args.projectId });
      } else {
        console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "generating_prd", status: "skipped" }));
      }

      // Step 2: Research tech stack (skip if already done)
      if (!project.techStackResearch) {
        console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "researching_stack", status: "running" }));
        await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
          projectId: args.projectId,
          scaffoldingStatus: "researching_stack",
        });
        await ctx.runAction(api.scaffolding.researchTechStack, { projectId: args.projectId });
      } else {
        console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "researching_stack", status: "skipped" }));
      }

      // Check if we need user choices
      const updated = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
      if (updated?.scaffoldingStatus === "awaiting_tech_choices") {
        console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "pipeline", status: "awaiting_choices" }));
        return; // UI will call resumeAfterChoices when user picks
      }

      // No choices needed — schedule sandbox as independent action (avoids Convex action timeout)
      console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "pipeline", status: "scheduling_sandbox" }));
      await ctx.scheduler.runAfter(0, api.scaffolding.executeSandbox, { projectId: args.projectId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown scaffolding error";
      console.log(formatLogEntry({ action: "runScaffoldingPipeline", projectId: pid, step: "pipeline", status: "failed", error: message }));
      await reportToSentry({ message: `Scaffolding pipeline failed: ${message}`, context: { projectId: args.projectId, step: "runScaffoldingPipeline" } });
      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
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
    console.log(formatLogEntry({ action: "resumeAfterChoices", projectId: args.projectId, step: "pipeline", status: "scheduling_sandbox" }));
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
    await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "preparing_sandbox", status: "started" }) });

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    });

    try {
      // Validate project exists and has required data
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_project", status: "started" }));
      const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
      if (!project) throw new NotFoundError("Project", args.projectId);
      const activeSandboxes = await ctx.runQuery(internal.projects.countActiveSandboxes, { userId: project.userId });
      if (activeSandboxes >= 2) {
        throw new PipelineError("sandbox_setup", "Too many active sandboxes. Please wait for current builds to complete.");
      }
      if (!project.githubRepoFullName) throw new PipelineError("sandbox_setup", "No GitHub repo linked to project");
      if (!project.prdMarkdown) throw new PipelineError("sandbox_setup", "PRD not generated");
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_project", status: "completed", repo: project.githubRepoFullName, template: project.templateName || "unknown" }));

      // Get and validate user credentials
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_credentials", status: "started" }));
      const user = await ctx.runQuery(internal.users.getById, { userId: project.userId });
      if (!user?.githubToken) throw new PipelineError("sandbox_setup", "GitHub not connected");
      const githubToken = decryptToken(user.githubToken);

      // Validate credentials are available BEFORE creating sandbox
      validateCredentialsAvailable(githubToken);
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_credentials", status: "completed" }));

      // Validate repo access with retry
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_repo_access", status: "started", repo: project.githubRepoFullName }));
      const repoAccessStart = Date.now();
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
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "validate_repo_access", status: "completed", durationMs: Date.now() - repoAccessStart }));

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
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "build_prompt", status: "completed", promptLength: prompt.length, resolvedIntegrations: techStack.resolved?.length ?? 0 }));

      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "preparing_sandbox",
      });

      // Create sandbox with retry (NOT ephemeral — persists across actions)
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "create_sandbox", status: "started" }));
      const sandboxCreateStart = Date.now();
      const sandbox = await withRetry(
        () => daytona.create({
          language: "typescript",
          autoStopInterval: 30,
          envVars: { GITHUB_TOKEN: githubToken },
          labels: { project: "shipright", projectId: args.projectId },
        }, { timeout: SANDBOX_TIMEOUTS.createSandbox }),
        DAYTONA_RETRY_CONFIG,
        { operation: "daytona.create", projectId: pid },
      );

      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "create_sandbox", status: "completed", sandboxId: sandbox.id, durationMs: Date.now() - sandboxCreateStart }));

      // Provision all credentials using unified credential manager
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "provision_credentials", status: "started" }));
      const credStart = Date.now();
      const credentials = buildSandboxCredentials(githubToken);
      await provisionSandboxCredentials(sandbox, credentials);
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "provision_credentials", status: "completed", durationMs: Date.now() - credStart }));

      // Setup environment (clone repos, copy files, configure git)
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "setup_environment", status: "started" }));
      const envStart = Date.now();
      await setupSandboxEnvironment(sandbox, project.githubRepoFullName, githubToken, prompt);
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "setup_environment", status: "completed", durationMs: Date.now() - envStart }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "preparing_sandbox", status: "completed", durationMs: Date.now() - sandboxCreateStart }) });

      // Launch Claude Code as background process
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "launch_claude", status: "started" }));
      const launchStart = Date.now();
      await launchClaudeCodeProcess(sandbox);
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "launch_claude", status: "completed", durationMs: Date.now() - launchStart }));

      // Save sandbox ID so pollSandbox can reconnect
      await ctx.runMutation(internal.projects.saveSandboxInfo, {
        projectId: args.projectId,
        sandboxId: sandbox.id,
        sandboxSessionId: "nohup",
        sandboxCommandId: "nohup",
      });

      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "running_sandbox",
      });

      const totalSetupMs = Date.now() - (await Promise.resolve(sandboxCreateStart));
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "running_sandbox", status: "started", totalSetupMs }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "started", metadata: { totalSetupMs } }) });

      // Schedule polling action to check completion
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "schedule_polling", status: "completed", initialDelayMs: POLLING_CONFIG.initialDelayMs }));
      await ctx.scheduler.runAfter(POLLING_CONFIG.initialDelayMs, api.scaffolding.pollSandbox, { projectId: args.projectId });
    } catch (error: unknown) {
      const wrapped = wrapError(error, "sandbox_setup", { projectId: pid });
      const userMessage = getUserMessage(wrapped);

      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }) });
      await reportToSentry({ message: wrapped.message, context: { projectId: pid, step: "sandbox_setup" } });

      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
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
    const pollStart = Date.now();
    console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "poll_check", status: "started", pollCount: count }));

    const project = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
    if (!project || !project.sandboxId || !project.sandboxSessionId) {
      throw new PipelineError("sandbox_poll", "No sandbox info found", { projectId: pid });
    }

    // Bail if already completed or failed
    if (project.scaffoldingStatus === "scaffolding_complete" || project.scaffoldingStatus === "scaffolding_failed") {
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "poll_check", status: "skipped", reason: project.scaffoldingStatus }));
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
        const elapsedMinutes = ((count * POLLING_CONFIG.intervalMs) + POLLING_CONFIG.initialDelayMs) / 60_000;
        // Log output every 3 polls for better visibility
        if (count % 3 === 2) {
          try {
            const output = await sandbox.process.executeCommand('tail -30 /tmp/claude_output.txt 2>/dev/null || echo "(no output yet)"');
            const outputSnippet = (output.result || "").slice(-800);
            console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "running_sandbox", status: "in_progress", pollCount: count, elapsedMinutes: Math.round(elapsedMinutes * 10) / 10 }));
            console.log(`[pollSandbox] Claude output (tail 30):\n${outputSnippet}`);
          } catch { /* ignore */ }
        } else {
          console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "running_sandbox", status: "still_running", pollCount: count, elapsedMinutes: Math.round(elapsedMinutes * 10) / 10 }));
        }
        // Also check output file size to confirm Claude is producing output
        try {
          const sizeCheck = await sandbox.process.executeCommand('wc -c < /tmp/claude_output.txt 2>/dev/null || echo "0"');
          const outputBytes = parseInt((sizeCheck.result || "0").trim(), 10);
          console.log(`[pollSandbox] output file size: ${outputBytes} bytes`);
        } catch { /* ignore */ }

        // Timeout after 40 polls (~20 min)
        if (count >= POLLING_CONFIG.maxAttempts) {
          try {
            const output = await sandbox.process.executeCommand('tail -50 /tmp/claude_output.txt 2>/dev/null');
            console.log(`[pollSandbox] TIMEOUT after ${POLLING_CONFIG.maxAttempts} polls (~${POLLING_CONFIG.timeoutMinutes}min) - Claude output:\n${(output.result || "").slice(-1500)}`);
          } catch { /* ignore */ }
          throw new ExternalServiceError("anthropic", "Claude Code timed out after 20 minutes", { pollCount: count });
        }
        // Re-schedule poll
        await ctx.scheduler.runAfter(POLLING_CONFIG.intervalMs, api.scaffolding.pollSandbox, { projectId: args.projectId, pollCount: count + 1 });
        return;
      }

      const exitCode = parseInt(exitCodeStr, 10);
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "claude_finished", status: exitCode === 0 ? "success" : "failed", exitCode, pollCount: count }));

      if (exitCode !== 0) {
        const output = await sandbox.process.executeCommand('tail -50 /tmp/claude_output.txt 2>/dev/null');
        console.log(`[pollSandbox] Claude Code failed output (tail 50):\n${(output.result || "").slice(-1500)}`);
        throw new ExternalServiceError("anthropic", `Claude Code failed (exit ${exitCode}): ${(output.result || "").slice(0, 500)}`, { exitCode });
      }

      // Claude Code completed successfully — commit and push
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "running_sandbox", status: "completed" }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "completed" }) });

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

      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "pushing_files",
      });
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "pushing_files", status: "started" }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "pushing_files", status: "started" }) });

      // List what Claude Code produced before pushing
      try {
        const diffStat = await sandbox.process.executeCommand('cd project && git add . && git diff --cached --stat 2>/dev/null | tail -20');
        console.log(`[pollSandbox] git diff --stat:\n${(diffStat.result || "").slice(-1000)}`);
      } catch { /* ignore */ }

      // Git commit and push with retry for transient failures
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "git_push", status: "started" }));
      const pushStart = Date.now();
      const pushResult = await withRetry(
        async () => {
          const result = await sandbox!.process.executeCommand(
            'cd project && git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main',
            undefined, undefined, SANDBOX_TIMEOUTS.gitPush,
          );
          if (result.exitCode !== 0) {
            console.log(`[pollSandbox] git push exitCode=${result.exitCode} output: ${(result.result || "").slice(-500)}`);
            throw new Error(`Git push failed: ${result.result?.slice(0, 500)}`);
          }
          return result;
        },
        { ...GITHUB_RETRY_CONFIG, maxAttempts: 3 },
        { operation: "git_push", repo: project.githubRepoFullName },
      );
      const pushDurationMs = Date.now() - pushStart;
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "git_push", status: "completed", durationMs: pushDurationMs }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "pushing_files", status: "completed", durationMs: pushDurationMs }) });

      // Success!
      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_complete",
      });
      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "scaffolding_complete", status: "completed", totalPollDurationMs: Date.now() - pollStart }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_complete", status: "completed" }) });

    } catch (error: unknown) {
      const wrapped = wrapError(error, "sandbox_poll", { projectId: pid, pollCount: count });
      const userMessage = getUserMessage(wrapped);

      console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }));
      await ctx.runMutation(internal.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_failed", status: "failed", error: wrapped.message }) });
      await reportToSentry({ message: wrapped.message, context: { projectId: pid, step: "sandbox_poll", pollCount: count } });

      await ctx.runMutation(internal.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: userMessage,
      });
    } finally {
      // Cleanup sandbox on completion (success or failure)
      // Re-check current status to avoid deleting sandbox while still polling
      if (sandbox) {
        const current = await ctx.runQuery(internal.projects.getById, { projectId: args.projectId });
        const done = current?.scaffoldingStatus === "scaffolding_complete" || current?.scaffoldingStatus === "scaffolding_failed";
        if (done) {
          console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "cleanup_sandbox", status: "started", sandboxId: project.sandboxId! }));
          try {
            await daytona.delete(sandbox);
            console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "cleanup_sandbox", status: "completed" }));
          } catch (cleanupErr) {
            console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "cleanup_sandbox", status: "failed", error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr) }));
          }
        } else {
          console.log(formatLogEntry({ action: "pollSandbox", projectId: pid, step: "cleanup_sandbox", status: "skipped", reason: `status=${current?.scaffoldingStatus}` }));
        }
      }
    }
  },
});

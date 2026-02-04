"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { api } from "./_generated/api";
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

// Parse JSON from AI response (may be wrapped in code blocks)
export function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim();
  if (jsonText.includes("```")) {
    const match = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) jsonText = match[1].trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("No valid JSON found in AI response");
  }
}

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

      // No choices needed — proceed to sandbox
      await ctx.runAction(api.scaffolding.executeSandbox, { projectId: args.projectId });
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
    try {
      await ctx.runAction(api.scaffolding.executeSandbox, { projectId: args.projectId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown scaffolding error";
      await reportToSentry({ message: `Resume after choices failed: ${message}`, context: { projectId: args.projectId, step: "resumeAfterChoices" } });
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: message,
      });
      throw error;
    }
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

// Steps 3-7: Daytona sandbox lifecycle
export const executeSandbox = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const sandboxStartedAt = Date.now();
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "preparing_sandbox", status: "started" }));
    await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "preparing_sandbox", status: "started" }) });

    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project) throw new Error("Project not found");
    if (!project.githubRepoFullName) throw new Error("No GitHub repo");
    if (!project.prdMarkdown) throw new Error("PRD not generated");

    // Get user's GitHub token
    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new Error("GitHub not connected");
    const githubToken = decryptToken(user.githubToken);

    // Checkpoint A: Validate repo exists before expensive sandbox creation
    const repoParsed = parseRepoFullName(project.githubRepoFullName);
    if (!repoParsed) throw new Error("Invalid repo name format");
    const octokit = new Octokit({ auth: githubToken });
    const repoCheck = await validateRepoAccess(octokit, repoParsed.owner, repoParsed.repo);
    if (!repoCheck.accessible) {
      const errorMsg = `Repo unavailable before sandbox: ${repoCheck.message}`;
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "repo_validation", status: "failed", error: errorMsg }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "repo_validation", status: "failed", error: errorMsg, metadata: { reason: repoCheck.reason } }) });
      await reportToSentry({ message: errorMsg, context: { projectId: pid, step: "repo_validation", reason: repoCheck.reason } });
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: repoCheck.message,
      });
      return { success: false, reason: repoCheck.reason };
    }

    // Get template info
    const templates = await ctx.runQuery(api.templates.list, {});
    const template = templates.find((t: { _id: string }) => t._id === project.templateId);

    // Build Claude Code prompt
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

    // Update status: preparing sandbox
    await ctx.runMutation(api.projects.updateScaffoldingStatus, {
      projectId: args.projectId,
      scaffoldingStatus: "preparing_sandbox",
    });

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    });

    let sandbox;
    try {
      // Create ephemeral sandbox
      sandbox = await daytona.create({
        language: "typescript",
        ephemeral: true,
        autoStopInterval: 15,
        envVars: {
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN || "",
          GITHUB_TOKEN: githubToken,
        },
        labels: { project: "shipright", projectId: args.projectId },
      }, { timeout: 120 });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "running_sandbox",
      });

      const claudeStartedAt = Date.now();
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "running_sandbox", status: "started" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "started" }) });

      // Clone user's repo using SDK git API (relative paths resolve from sandbox workdir)
      await sandbox.git.clone(
        `https://github.com/${project.githubRepoFullName}.git`,
        "project",
        undefined,
        undefined,
        "x-access-token",
        githubToken,
      );

      // Clone cc-template (public repo)
      await sandbox.git.clone(
        "https://github.com/seanchiuai/cc-template.git",
        "cc-template",
      );

      // Copy infrastructure files (.claude/ directory)
      await sandbox.process.executeCommand(
        "cp -r cc-template/.claude project/",
      );

      // Copy template files
      await sandbox.process.executeCommand(
        "cp cc-template/template-CLAUDE.md project/ && " +
        "cp cc-template/TASKS.md project/ && " +
        "mkdir -p project/docs project/prompts && " +
        "cp cc-template/docs/PRD.md project/docs/ && " +
        "cp cc-template/docs/design.md project/docs/ && " +
        "cp cc-template/docs/development-progress.yaml project/docs/ && " +
        "cp cc-template/prompts/phase-1.md project/prompts/",
      );

      // Write prompt file (avoids shell escaping issues)
      await sandbox.fs.uploadFile(
        Buffer.from(prompt, "utf-8"),
        "prompt.txt",
      );

      // Configure git
      await sandbox.process.executeCommand(
        'git config user.name "Shipright" && git config user.email "bot@shipright.dev"',
        "project",
      );

      // Install Claude Code CLI in sandbox
      await sandbox.process.executeCommand(
        "npm install -g @anthropic-ai/claude-code",
        undefined,
        undefined,
        120,
      );

      // Run Claude Code with prompt (bypassPermissions needed for file writes in non-interactive mode)
      const claudeResult = await sandbox.process.executeCommand(
        'claude --print --permission-mode bypassPermissions "$(cat ../prompt.txt)"',
        "project",
        undefined,
        600, // 10 minutes
      );

      if (claudeResult.exitCode !== 0) {
        throw new Error(`Claude Code failed: ${claudeResult.result?.slice(0, 500)}`);
      }

      const claudeDurationMs = Date.now() - claudeStartedAt;
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "running_sandbox", status: "completed", durationMs: claudeDurationMs }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "running_sandbox", status: "completed", durationMs: claudeDurationMs }) });

      // Checkpoint B: Validate repo still exists before pushing
      const prePushCheck = await validateRepoAccess(octokit, repoParsed.owner, repoParsed.repo);
      if (!prePushCheck.accessible) {
        const errorMsg = `Repo unavailable before push (Claude Code output lost): ${prePushCheck.message}`;
        console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "repo_validation_pre_push", status: "failed", error: errorMsg }));
        await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "repo_validation_pre_push", status: "failed", error: errorMsg, metadata: { reason: prePushCheck.reason } }) });
        await reportToSentry({ message: errorMsg, context: { projectId: pid, step: "repo_validation_pre_push", reason: prePushCheck.reason } });
        await ctx.runMutation(api.projects.updateScaffoldingStatus, {
          projectId: args.projectId,
          scaffoldingStatus: "scaffolding_failed",
          scaffoldingError: `Scaffolding completed but could not push: ${prePushCheck.message}`,
        });
        return { success: false, reason: prePushCheck.reason };
      }

      // Commit and push
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "pushing_files",
      });
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "pushing_files", status: "started" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "pushing_files", status: "started" }) });

      const pushResult = await sandbox.process.executeCommand(
        'git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main',
        "project",
        undefined,
        60,
      );

      if (pushResult.exitCode !== 0) {
        throw new Error(`Git push failed: ${pushResult.result?.slice(0, 500)}`);
      }

      // Success
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_complete",
      });

      const totalDurationMs = Date.now() - sandboxStartedAt;
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "pushing_files", status: "completed" }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "pushing_files", status: "completed" }) });
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "scaffolding_complete", status: "completed", durationMs: totalDurationMs }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_complete", status: "completed", durationMs: totalDurationMs }) });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sandbox execution failed";
      const durationMs = Date.now() - sandboxStartedAt;
      console.log(formatLogEntry({ action: "executeSandbox", projectId: pid, step: "scaffolding_failed", status: "failed", durationMs, error: message }));
      await ctx.runMutation(api.pipelineEvents.log, { ...buildEventArgs({ projectId: pid, step: "scaffolding_failed", status: "failed", durationMs, error: message }) });
      await reportToSentry({ message: `Sandbox execution failed: ${message}`, context: { projectId: pid, step: "executeSandbox", durationMs: String(durationMs) } });
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: message,
      });
      throw error;
    } finally {
      // Cleanup sandbox
      if (sandbox) {
        try {
          await daytona.delete(sandbox);
        } catch {
          // Best-effort cleanup
        }
      }
    }
  },
});

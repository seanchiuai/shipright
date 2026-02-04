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

    return { prdMarkdown: result.text };
  },
});

// Step 2: Research tech stack integrations beyond base template
export const researchTechStack = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
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
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (!project) throw new Error("Project not found");
    if (!project.githubRepoFullName) throw new Error("No GitHub repo");
    if (!project.prdMarkdown) throw new Error("PRD not generated");

    // Get user's GitHub token
    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new Error("GitHub not connected");
    const githubToken = decryptToken(user.githubToken);

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
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
          GITHUB_TOKEN: githubToken,
        },
        labels: { project: "shipright", projectId: args.projectId },
      }, { timeout: 120 });

      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "running_sandbox",
      });

      // Clone user's repo
      const cloneResult = await sandbox.process.executeCommand(
        `git clone https://${githubToken}@github.com/${project.githubRepoFullName}.git /workspace/project`,
        undefined,
        undefined,
        60,
      );
      if (cloneResult.exitCode !== 0) {
        throw new Error(`Git clone failed: ${cloneResult.result}`);
      }

      // Clone cc-template (public repo)
      const ccCloneResult = await sandbox.process.executeCommand(
        "git clone https://github.com/seanchiuai/cc-template.git /workspace/cc-template",
        undefined,
        undefined,
        60,
      );
      if (ccCloneResult.exitCode !== 0) {
        throw new Error(`cc-template clone failed: ${ccCloneResult.result}`);
      }

      // Copy infrastructure files (.claude/ directory)
      await sandbox.process.executeCommand(
        "cp -r /workspace/cc-template/.claude /workspace/project/",
      );

      // Copy template files
      await sandbox.process.executeCommand(
        "cp /workspace/cc-template/template-CLAUDE.md /workspace/project/ && " +
        "cp /workspace/cc-template/TASKS.md /workspace/project/ && " +
        "mkdir -p /workspace/project/docs /workspace/project/prompts && " +
        "cp /workspace/cc-template/docs/PRD.md /workspace/project/docs/ && " +
        "cp /workspace/cc-template/docs/design.md /workspace/project/docs/ && " +
        "cp /workspace/cc-template/docs/development-progress.yaml /workspace/project/docs/ && " +
        "cp /workspace/cc-template/prompts/phase-1.md /workspace/project/prompts/",
      );

      // Write prompt file (avoids shell escaping issues)
      await sandbox.fs.uploadFile(
        Buffer.from(prompt, "utf-8"),
        "/workspace/prompt.txt",
      );

      // Configure git
      await sandbox.process.executeCommand(
        'cd /workspace/project && git config user.name "Shipright" && git config user.email "bot@shipright.dev"',
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
        'cd /workspace/project && claude --print --permission-mode bypassPermissions "$(cat /workspace/prompt.txt)"',
        "/workspace/project",
        undefined,
        600, // 10 minutes
      );

      if (claudeResult.exitCode !== 0) {
        throw new Error(`Claude Code failed: ${claudeResult.result?.slice(0, 500)}`);
      }

      // Commit and push
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "pushing_files",
      });

      const pushResult = await sandbox.process.executeCommand(
        'cd /workspace/project && git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main',
        "/workspace/project",
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

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sandbox execution failed";
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

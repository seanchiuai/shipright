# Scaffolding Generation Reference

Convex action patterns and prompt templates for the scaffolding pipeline.

## Convex Actions Overview

```
convex/scaffolding.ts
├── generatePrd          — Step 1: Requirements → PRD markdown
├── researchTechStack    — Step 2: Identify integrations, recommend libraries
├── submitTechChoices    — Step 2b: Save user's picks for ambiguous choices
├── runScaffoldingPipeline — Orchestrator: Steps 1-2, then schedules sandbox
├── resumeAfterChoices   — Resume pipeline after user picks
├── executeSandbox       — Steps 3-5: Sandbox setup, files, launch Claude Code
└── pollSandbox          — Step 6-7: Poll for completion, commit+push, cleanup

convex/lib/
├── credentials.ts       — Unified credential manager for sandbox provisioning
├── retry.ts             — Exponential backoff for external APIs
├── errors.ts            — Structured error types with user messages
├── git_operations.ts    — Tested Git operations (fetchRepoFiles, commitFiles, 40+ tests)
├── github.ts            — GitHub API helpers (validateRepoAccess, parseRepoFullName)
├── vertex.ts            — Shared Vertex AI provider config
├── json.ts              — JSON parsing (handles markdown code blocks)
└── logger.ts            — Structured log formatting for pipeline actions
```

## Configuration Constants

```typescript
// convex/scaffolding.ts

/** Polling configuration for sandbox completion checks */
export const POLLING_CONFIG = {
  initialDelayMs: 60_000,      // 60s before first poll
  intervalMs: 30_000,           // 30s between polls
  maxAttempts: 40,              // Max 40 polls = ~20 min timeout
  timeoutMinutes: 20,
} as const;

/** Timeout configuration for sandbox operations (seconds) */
export const SANDBOX_TIMEOUTS = {
  createSandbox: 120,   // 2 min to create sandbox
  npmInstall: 90,       // 90s for npm install (Claude Code CLI)
  gitPush: 60,          // 60s for git push
} as const;

/** Claude Code model configuration (not exported) */
const CLAUDE_CODE_CONFIG = {
  model: "claude-sonnet-4-20250514",
  permissionMode: "bypassPermissions",
} as const;
```

Note: `pollSandbox` is invoked via `ctx.scheduler.runAfter()` from `executeSandbox`. It runs independently with its own 10-minute time budget, separate from the orchestrator action.

## Step 1: PRD Generation

```typescript
// convex/scaffolding.ts
export const generatePrd = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });

    const prdMarkdown = await generateText({
      model: getVertexProvider()("gemini-2.5-flash"),
      system: PRD_GENERATION_PROMPT,
      prompt: JSON.stringify(project.requirements),
    });

    await ctx.runMutation(api.projects.savePrdMarkdown, {
      projectId: args.projectId,
      prdMarkdown: prdMarkdown.text,
    });
  },
});
```

### PRD Generation Prompt

```typescript
// prompts/scaffolding-prd.ts
export const PRD_GENERATION_PROMPT = `You are a product manager converting interview
requirements into a formal PRD document.

Given a structured requirements object, produce a PRD in markdown with:

- Problem Statement
- Target Users (with personas)
- User Stories (US-001 format, "As a [user], I want [goal] so that [reason]")
  - Each with acceptance criteria as markdown checkboxes
- Core Features (grouped by priority: must/should/could)
- Data Model (TypeScript interfaces for key entities)
- User Flows (step-by-step for key journeys)
- Integrations (external services needed)
- Non-Goals (explicitly out of scope)
- Technical Constraints

Derive ONLY from provided requirements. Do not hallucinate features.`;
```

## Step 2: Tech Stack Research

```typescript
// convex/scaffolding.ts
export const researchTechStack = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    const template = await ctx.runQuery(api.templates.getById, { templateId: project.templateId });

    const result = await generateText({
      model: getVertexProvider()("gemini-2.5-flash"),
      system: TECH_STACK_RESEARCH_PROMPT,
      prompt: JSON.stringify({
        requirements: project.requirements,
        templateStack: template.stack,
        templateCapabilities: template.capabilities,
        gaps: project.matchGaps,
      }),
    });

    const techStack = JSON.parse(result.text);

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
  },
});
```

### Tech Stack Research Prompt

```typescript
// prompts/tech-stack-research.ts
export const TECH_STACK_RESEARCH_PROMPT = `You are a technical architect choosing
libraries and integrations for a web application.

Given:
- App requirements
- Base template stack (e.g., Next.js + Supabase + Clerk)
- Identified gaps (features template doesn't cover)

For each gap/integration need:
1. Recommend the BEST library or API
2. Explain why in 1-2 sentences
3. If confident (>80%), mark as "resolved"
4. If torn between 2-3 options, mark as "choice" with options

Output JSON:
{
  "resolved": [
    { "need": "Payments", "library": "stripe", "package": "@stripe/stripe-js", "reason": "..." }
  ],
  "choices": [
    { "need": "Email", "options": [
      { "library": "Resend", "package": "resend", "reason": "..." },
      { "library": "SendGrid", "package": "@sendgrid/mail", "reason": "..." }
    ]}
  ]
}

Prefer: well-maintained, TypeScript-native, Next.js-compatible libraries.
Consider: bundle size, developer experience, documentation quality.`;
```

## Pipeline Orchestrator

```typescript
export const runScaffoldingPipeline = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Update project status
    await ctx.runMutation(api.projects.updateStatus, {
      projectId: args.projectId,
      status: "scaffolding",
    });

    // Step 1: Generate PRD
    await ctx.runMutation(api.projects.updateScaffoldingStatus, {
      projectId: args.projectId,
      scaffoldingStatus: "generating_prd",
    });
    await ctx.runAction(api.scaffolding.generatePrd, { projectId: args.projectId });

    // Step 2: Research tech stack
    await ctx.runMutation(api.projects.updateScaffoldingStatus, {
      projectId: args.projectId,
      scaffoldingStatus: "researching_stack",
    });
    await ctx.runAction(api.scaffolding.researchTechStack, { projectId: args.projectId });

    // Check if we need user choices
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    if (project.scaffoldingStatus === "awaiting_tech_choices") {
      return; // UI will call resumeAfterChoices when user picks
    }

    // No choices needed — proceed to sandbox
    await ctx.runAction(api.scaffolding.executeSandbox, { projectId: args.projectId });
  },
});

export const resumeAfterChoices = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.runAction(api.scaffolding.executeSandbox, { projectId: args.projectId });
  },
});
```

## Schema (projects table scaffolding fields)

```typescript
// convex/schema.ts - projects table (scaffolding-related fields)
prdMarkdown: v.optional(v.string()),
techStackResearch: v.optional(v.any()),
techStackChoices: v.optional(v.any()),
scaffoldingStatus: v.optional(v.union(
  v.literal("generating_prd"),
  v.literal("researching_stack"),
  v.literal("awaiting_tech_choices"),
  v.literal("preparing_sandbox"),
  v.literal("running_sandbox"),
  v.literal("pushing_files"),
  v.literal("scaffolding_complete"),
  v.literal("scaffolding_failed"),
)),
scaffoldingError: v.optional(v.string()),
sandboxId: v.optional(v.string()),
sandboxSessionId: v.optional(v.string()),
sandboxCommandId: v.optional(v.string()),

// Project status union (includes "scaffolding")
status: v.union(
  v.literal("interview"),
  v.literal("matching"),
  v.literal("matched"),
  v.literal("building"),
  v.literal("scaffolding"),
  v.literal("complete"),
  v.literal("repo_failed"),
),

// Pipeline events table (separate from projects)
pipelineEvents: defineTable({
  projectId: v.id("projects"),
  step: v.string(),
  status: v.string(),
  durationMs: v.optional(v.number()),
  error: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_project_timestamp", ["projectId", "timestamp"]),
```

## Error Recovery

Each step saves output independently. Pipeline resumes from last incomplete step:

| Step | Saved to | Recovery |
|------|----------|----------|
| PRD generation | `prdMarkdown` | Skip if present |
| Tech stack research | `techStackResearch` | Skip if present |
| User choices | `techStackChoices` | Skip if present |
| Sandbox execution | `scaffoldingStatus` | Retry from this step |

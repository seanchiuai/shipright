"use node";

import { action, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateObject } from "ai";
import { z } from "zod";
import { getVertexProvider } from "./lib/vertex";
import { formatLogEntry } from "./lib/logger";
import { reportToSentry } from "./lib/sentry";
import { BLUEPRINT_GENERATION_PROMPT } from "../prompts";
import {
  Requirements,
  requirementsSummary,
  identifyGaps,
  identifyIncluded,
  scoreAuth,
  scoreDatabase,
  scorePayments,
  scoreFeatures,
  scoreUI,
  DEFAULT_WEIGHTS,
} from "./matching";

// --- Mutations ---

export const create = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blueprints", {
      projectId: args.projectId,
      status: "generating",
    });
  },
});

export const saveAllSections = internalMutation({
  args: {
    blueprintId: v.id("blueprints"),
    projectId: v.id("projects"),
    sections: v.object({
      executiveSummary: v.optional(v.string()),
      userPersonas: v.optional(v.string()),
      featureBreakdown: v.optional(v.string()),
      userFlows: v.optional(v.string()),
      dataModel: v.optional(v.string()),
      techStackRecommendations: v.optional(v.string()),
      monetizationStrategy: v.optional(v.string()),
      mvpScope: v.optional(v.string()),
      architectureOverview: v.optional(v.string()),
      designDirection: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.blueprintId, {
      ...args.sections,
      status: "ready",
    });
    await ctx.db.patch(args.projectId, {
      status: "blueprint_ready",
      blueprintId: args.blueprintId,
    });
  },
});

export const markFailed = internalMutation({
  args: {
    blueprintId: v.id("blueprints"),
    projectId: v.id("projects"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.blueprintId, {
      status: "failed",
      generationError: args.error,
    });
    await ctx.db.patch(args.projectId, {
      status: "blueprint_failed",
    });
  },
});

export const cacheMarkdown = internalMutation({
  args: {
    blueprintId: v.id("blueprints"),
    markdown: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.blueprintId, { markdownExport: args.markdown });
  },
});

// --- Queries ---

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blueprints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
  },
});

// --- Actions ---

const blueprintSchema = z.object({
  executiveSummary: z.string(),
  userPersonas: z.string(),
  featureBreakdown: z.string(),
  userFlows: z.string(),
  dataModel: z.string(),
  techStackRecommendations: z.string(),
  monetizationStrategy: z.string(),
  mvpScope: z.string(),
  architectureOverview: z.string(),
  designDirection: z.string(),
});

export const generate = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const pid = args.projectId;
    console.log(formatLogEntry({ action: "blueprint.generate", projectId: pid, status: "started" }));

    // 1. Get project and requirements
    const project = await ctx.runQuery(internal.projects.getById, { projectId: pid });
    if (!project?.requirements) {
      throw new Error("Project has no requirements");
    }

    const requirements = project.requirements as Requirements;
    if (!Array.isArray(requirements.keyFeatures)) {
      requirements.keyFeatures = [];
    }
    if (!requirements.constraints) {
      requirements.constraints = { timeline: null, mustHave: [], mustNotHave: [] };
    }

    // 2. Create blueprint record
    const blueprintId = await ctx.runMutation(internal.blueprint.create, { projectId: pid });

    // 3. Update project status
    await ctx.runMutation(internal.projects.updateStatusInternal, {
      projectId: pid,
      status: "generating_blueprint",
    });

    try {
      // 4. Run template matching internally for tech context
      let techContext = "";
      try {
        const templates = await ctx.runQuery(internal.templates.listInternal, {});
        if (templates.length > 0) {
          // Score templates and find best match
          let bestTemplate = templates[0];
          let bestScore = 0;

          for (const template of templates) {
            const caps = template.capabilities as {
              auth: { present: boolean; providers: string[]; hasRoles: boolean; hasOrgs: boolean };
              database: { present: boolean; type: string; realtime: boolean };
              payments: { present: boolean; provider?: string; models?: string[] };
              features: { fileUploads: boolean; email: boolean; search: boolean; ai: boolean };
              ui: { framework: string; hasAdminDashboard: boolean; hasLandingPage: boolean };
            };
            const score =
              scoreAuth(requirements, caps.auth) * DEFAULT_WEIGHTS.auth +
              scoreDatabase(requirements, caps.database) * DEFAULT_WEIGHTS.database +
              scorePayments(requirements, caps.payments) * DEFAULT_WEIGHTS.payments +
              scoreFeatures(requirements, caps.features) * DEFAULT_WEIGHTS.features +
              scoreUI(requirements, caps.ui) * DEFAULT_WEIGHTS.ui;
            if (score > bestScore) {
              bestScore = score;
              bestTemplate = template;
            }
          }

          const included = identifyIncluded(bestTemplate as Parameters<typeof identifyIncluded>[0]);
          const gaps = identifyGaps(requirements, bestTemplate as Parameters<typeof identifyGaps>[1]);

          techContext = `\n\nBest matching template: ${bestTemplate.name} (${Math.round(bestScore)}% match)
Stack: ${bestTemplate.stack.join(", ")}
Included capabilities: ${included.join(", ")}
${gaps.length > 0 ? `Gaps to address: ${gaps.join(", ")}` : "All requirements covered by template"}`;
        }
      } catch (e) {
        console.warn("Template matching for blueprint context failed, continuing without:", e);
      }

      // 5. Build prompt with full requirements context
      const reqSummary = requirementsSummary(requirements);
      const fullRequirements = JSON.stringify(requirements, null, 2);

      const prompt = `Here are the complete requirements extracted from the founder interview:

${reqSummary}

Full requirements JSON:
${fullRequirements}
${techContext}

Generate all 10 blueprint sections based on these requirements. Be specific to THIS app — no generic advice.`;

      // 6. Generate blueprint via Gemini
      const vertex = getVertexProvider();
      const { object: sections } = await generateObject({
        model: vertex("gemini-2.5-flash"),
        schema: blueprintSchema,
        system: BLUEPRINT_GENERATION_PROMPT,
        prompt,
      });

      // 7. Save sections
      await ctx.runMutation(internal.blueprint.saveAllSections, {
        blueprintId,
        projectId: pid,
        sections,
      });

      console.log(formatLogEntry({ action: "blueprint.generate", projectId: pid, status: "completed" }));
      return { blueprintId, status: "ready" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(formatLogEntry({ action: "blueprint.generate", projectId: pid, status: "failed", error: msg }));
      await reportToSentry({ message: `Blueprint generation failed: ${msg}`, context: { projectId: pid } });

      await ctx.runMutation(internal.blueprint.markFailed, {
        blueprintId,
        projectId: pid,
        error: msg,
      });

      return { blueprintId, status: "failed", error: msg };
    }
  },
});

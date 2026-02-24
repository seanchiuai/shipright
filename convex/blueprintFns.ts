import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

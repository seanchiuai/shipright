import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Pure helper for building event args (testable without ctx)
export function buildEventArgs(params: {
  projectId: Id<"projects">;
  step: string;
  status: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    projectId: params.projectId,
    step: params.step,
    status: params.status,
    ...(params.durationMs !== undefined && { durationMs: params.durationMs }),
    ...(params.error !== undefined && { error: params.error }),
    ...(params.metadata !== undefined && { metadata: params.metadata }),
    timestamp: Date.now(),
  };
}

// Mutation: insert a pipeline event
export const log = mutation({
  args: {
    projectId: v.id("projects"),
    step: v.string(),
    status: v.string(),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipelineEvents", args);
  },
});

// Query: events for a specific project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipelineEvents")
      .withIndex("by_project_timestamp", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

// Query: recent events across all projects (admin)
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("pipelineEvents")
      .order("desc")
      .take(limit);
  },
});

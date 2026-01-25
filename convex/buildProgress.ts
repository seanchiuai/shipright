import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("buildProgress")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    phase: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("error")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing progress for this phase
    const existing = await ctx.db
      .query("buildProgress")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("phase"), args.phase))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        message: args.message,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("buildProgress", {
        projectId: args.projectId,
        phase: args.phase,
        status: args.status,
        message: args.message,
        updatedAt: Date.now(),
      });
    }
  },
});

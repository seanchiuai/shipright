import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      status: "interview",
      interviewStep: 1,
    });
  },
});

export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { status: args.status });
  },
});

export const updateAppIdea = mutation({
  args: {
    projectId: v.id("projects"),
    appIdea: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      appIdea: args.appIdea,
      interviewStep: 2,
      interviewRound: 1,
    });
  },
});

export const updateInterviewStep = mutation({
  args: {
    projectId: v.id("projects"),
    step: v.number(),
    round: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      interviewStep: args.step,
      ...(args.round !== undefined && { interviewRound: args.round }),
    });
  },
});

export const updateRequirements = mutation({
  args: {
    projectId: v.id("projects"),
    requirements: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      requirements: args.requirements,
      interviewStep: 3,
    });
  },
});

export const resetInterview = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Delete all interview sessions for this project
    const sessions = await ctx.db
      .query("interviewSessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Reset project interview state
    await ctx.db.patch(args.projectId, {
      appIdea: undefined,
      interviewStep: 1,
      interviewRound: undefined,
      requirements: undefined,
    });
  },
});

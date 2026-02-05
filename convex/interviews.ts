import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("interviewMessages")
      .withIndex("by_project_timestamp", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .take(limit);
  },
});

export const addMessage = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"))),
    options: v.optional(v.array(v.string())),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("interviewMessages", {
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      questionType: args.questionType,
      options: args.options,
      isComplete: args.isComplete,
      timestamp: Date.now(),
    });
  },
});

export const clearIsComplete = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("interviewMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const msg of messages) {
      if (msg.isComplete) {
        await ctx.db.patch(msg._id, { isComplete: undefined });
      }
    }
  },
});

export const clearMessages = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("interviewMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

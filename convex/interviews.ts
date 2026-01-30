import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveQuestions = mutation({
  args: {
    projectId: v.id("projects"),
    round: v.number(),
    preamble: v.optional(v.string()),
    questions: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        required: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("interviewSessions")
      .withIndex("by_project_round", (q) =>
        q.eq("projectId", args.projectId).eq("round", args.round)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        questions: args.questions,
        ...(args.preamble ? { preamble: args.preamble } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("interviewSessions", {
      projectId: args.projectId,
      round: args.round,
      preamble: args.preamble,
      questions: args.questions,
    });
  },
});

export const getMessages = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interviewMessages")
      .withIndex("by_project_timestamp", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
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

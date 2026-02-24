import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getOwnedProject } from "./lib/auth";

export const getMessages = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("interviewMessages")
      .withIndex("by_project_timestamp", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .take(limit);
  },
});

// Internal: used by AI actions (which may run without direct auth context)
export const getMessagesInternal = internalQuery({
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
    questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"), v.literal("comparison"))),
    options: v.optional(v.array(v.string())),
    optionDescriptions: v.optional(v.array(v.string())),
    currentSection: v.optional(v.string()),
    sectionProgress: v.optional(v.any()),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Input length validation: prevent DoS via oversized messages
    if (args.role === "user" && args.content.length > 10_000) {
      throw new Error("Message too long (max 10,000 characters)");
    }
    await getOwnedProject(ctx, args.projectId);
    return await ctx.db.insert("interviewMessages", {
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      questionType: args.questionType,
      options: args.options,
      optionDescriptions: args.optionDescriptions,
      currentSection: args.currentSection,
      sectionProgress: args.sectionProgress,
      isComplete: args.isComplete,
      timestamp: Date.now(),
    });
  },
});

// Internal: used by AI actions to persist assistant messages
export const addMessageInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"), v.literal("comparison"))),
    options: v.optional(v.array(v.string())),
    optionDescriptions: v.optional(v.array(v.string())),
    currentSection: v.optional(v.string()),
    sectionProgress: v.optional(v.any()),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("interviewMessages", {
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      questionType: args.questionType,
      options: args.options,
      optionDescriptions: args.optionDescriptions,
      currentSection: args.currentSection,
      sectionProgress: args.sectionProgress,
      isComplete: args.isComplete,
      timestamp: Date.now(),
    });
  },
});

export const clearIsComplete = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
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

/** Delete a single message by ID (internal use for data cleanup) */
export const deleteMessage = internalMutation({
  args: { messageId: v.id("interviewMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

export const clearMessages = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    const messages = await ctx.db
      .query("interviewMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

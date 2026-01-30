import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { PROJECT_STATUS } from "./lib/constants";
import { getAuthenticatedUser, getOwnedProject } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      status: PROJECT_STATUS.INTERVIEW,
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
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, { status: args.status });
  },
});

export const updateAppIdea = mutation({
  args: {
    projectId: v.id("projects"),
    appIdea: v.string(),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, {
      appIdea: args.appIdea,
      interviewPhase: "conversation",
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
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, {
      interviewStep: args.step,
      ...(args.round !== undefined && { interviewRound: args.round }),
    });
  },
});

export const updateInterviewPhase = mutation({
  args: {
    projectId: v.id("projects"),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, {
      interviewPhase: args.phase,
    });
  },
});

export const updateRequirements = mutation({
  args: {
    projectId: v.id("projects"),
    requirements: v.any(),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, {
      requirements: args.requirements,
      interviewPhase: "summary",
    });
  },
});

export const resetInterview = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);

    // Delete all interview sessions (legacy)
    const sessions = await ctx.db
      .query("interviewSessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all interview messages
    const messages = await ctx.db
      .query("interviewMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Reset project interview state
    await ctx.db.patch(args.projectId, {
      appIdea: undefined,
      interviewStep: 1,
      interviewRound: undefined,
      interviewPhase: undefined,
      requirements: undefined,
    });
  },
});

export const updateGitHubRepo = mutation({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      githubRepoUrl: args.repoUrl,
      githubRepoFullName: args.repoFullName,
      status: PROJECT_STATUS.BUILDING,
    });
  },
});

export const rename = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);
    await ctx.db.patch(args.projectId, { name: args.name });
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await getOwnedProject(ctx, args.projectId);

    // Delete interview messages
    const messages = await ctx.db
      .query("interviewMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete interview sessions
    const sessions = await ctx.db
      .query("interviewSessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete the project
    await ctx.db.delete(args.projectId);
  },
});

export const setMatchedTemplate = mutation({
  args: {
    projectId: v.id("projects"),
    templateId: v.string(),
    templateName: v.string(),
    matchScore: v.number(),
    matchGaps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      templateId: args.templateId,
      templateName: args.templateName,
      matchScore: args.matchScore,
      matchGaps: args.matchGaps,
      status: PROJECT_STATUS.MATCHED,
    });
  },
});

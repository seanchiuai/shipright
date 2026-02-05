import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { PROJECT_STATUS } from "./lib/constants";
import { getAuthenticatedUser, getOwnedProject } from "./lib/auth";
import { deleteProjectData } from "./lib/cascade";

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
    status: v.union(v.literal("interview"), v.literal("matching"), v.literal("matched"), v.literal("building"), v.literal("scaffolding"), v.literal("complete"), v.literal("repo_failed")),
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
    phase: v.union(v.literal("seed"), v.literal("conversation"), v.literal("summary")),
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
    await deleteProjectData(ctx, args.projectId);

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

export const setRepoFailed = mutation({
  args: {
    projectId: v.id("projects"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      console.warn(`setRepoFailed: project ${args.projectId} not found (likely deleted)`);
      return;
    }

    const currentRetries = project.repoRetryCount ?? 0;
    await ctx.db.patch(args.projectId, {
      status: "repo_failed",
      repoError: args.error,
      repoRetryCount: currentRetries + 1,
    });
  },
});

export const retryRepoCreation = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProject(ctx, args.projectId);
    if (project.status !== "repo_failed") throw new Error("Project is not in failed state");
    if ((project.repoRetryCount ?? 0) >= 3) {
      throw new Error("Maximum retry attempts reached. Use restart instead.");
    }

    await ctx.db.patch(args.projectId, {
      status: "matched",
      repoError: undefined,
    });
  },
});

export const restartRepoCreation = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProject(ctx, args.projectId);
    if (project.status !== "repo_failed") throw new Error("Project is not in failed state");

    await ctx.db.patch(args.projectId, {
      status: "matched",
      repoError: undefined,
      repoRetryCount: 0,
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
    await deleteProjectData(ctx, args.projectId);
    await ctx.db.delete(args.projectId);
  },
});

export const savePrdMarkdown = mutation({
  args: {
    projectId: v.id("projects"),
    prdMarkdown: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { prdMarkdown: args.prdMarkdown });
  },
});

export const saveTechStackResearch = mutation({
  args: {
    projectId: v.id("projects"),
    techStackResearch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { techStackResearch: args.techStackResearch });
  },
});

export const submitTechChoices = mutation({
  args: {
    projectId: v.id("projects"),
    techStackChoices: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      techStackChoices: args.techStackChoices,
      scaffoldingStatus: "preparing_sandbox",
    });
  },
});

export const updateScaffoldingStatus = mutation({
  args: {
    projectId: v.id("projects"),
    scaffoldingStatus: v.union(
      v.literal("generating_prd"),
      v.literal("researching_stack"),
      v.literal("awaiting_tech_choices"),
      v.literal("preparing_sandbox"),
      v.literal("running_sandbox"),
      v.literal("pushing_files"),
      v.literal("scaffolding_complete"),
      v.literal("scaffolding_failed"),
    ),
    scaffoldingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { scaffoldingStatus: args.scaffoldingStatus };
    if (args.scaffoldingError !== undefined) {
      patch.scaffoldingError = args.scaffoldingError;
    }
    if (args.scaffoldingStatus === "scaffolding_complete") {
      patch.status = "complete";
    }
    await ctx.db.patch(args.projectId, patch);
  },
});

export const saveSandboxInfo = mutation({
  args: {
    projectId: v.id("projects"),
    sandboxId: v.string(),
    sandboxSessionId: v.string(),
    sandboxCommandId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      sandboxId: args.sandboxId,
      sandboxSessionId: args.sandboxSessionId,
      sandboxCommandId: args.sandboxCommandId,
    });
  },
});

export const recreateRepo = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProject(ctx, args.projectId);
    if (!project.templateId) throw new Error("No template matched");

    await ctx.db.patch(args.projectId, {
      githubRepoUrl: undefined,
      githubRepoFullName: undefined,
      repoError: undefined,
      repoRetryCount: 0,
      scaffoldingStatus: undefined,
      scaffoldingError: undefined,
      status: PROJECT_STATUS.MATCHED,
    });
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

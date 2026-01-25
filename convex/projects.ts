import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      return null;
    }

    return project;
  },
});

export const create = mutation({
  args: {
    idea: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Generate a name from the idea
    const name = args.idea.slice(0, 50).trim();

    const projectId = await ctx.db.insert("projects", {
      userId: identity.subject,
      idea: args.idea,
      name,
      status: "discovery",
      sandboxStatus: "destroyed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("projects"),
    status: v.union(
      v.literal("discovery"),
      v.literal("research"),
      v.literal("build"),
      v.literal("complete"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateSandbox = mutation({
  args: {
    id: v.id("projects"),
    sandboxId: v.optional(v.string()),
    sandboxStatus: v.union(
      v.literal("running"),
      v.literal("sleeping"),
      v.literal("destroyed")
    ),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(args.id, {
      sandboxId: args.sandboxId,
      sandboxStatus: args.sandboxStatus,
      previewUrl: args.previewUrl,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Project not found");
    }

    await ctx.db.delete(args.id);
  },
});

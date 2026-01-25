import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    idea: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("discovery"),
      v.literal("research"),
      v.literal("build"),
      v.literal("complete"),
      v.literal("error")
    ),
    sandboxId: v.optional(v.string()),
    sandboxStatus: v.union(
      v.literal("running"),
      v.literal("sleeping"),
      v.literal("destroyed")
    ),
    previewUrl: v.optional(v.string()),
    supabaseSchema: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    phase: v.union(
      v.literal("discovery"),
      v.literal("research"),
      v.literal("build"),
      v.literal("iterate")
    ),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  buildProgress: defineTable({
    projectId: v.id("projects"),
    phase: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("error")
    ),
    message: v.string(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),
});

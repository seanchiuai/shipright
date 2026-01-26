import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Override default users table to add custom fields
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    githubToken: v.optional(v.string()),
  }).index("email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(),
    requirements: v.optional(v.any()),
    templateId: v.optional(v.string()),
    githubRepoUrl: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  interviewSessions: defineTable({
    projectId: v.id("projects"),
    round: v.number(),
    userInput: v.string(),
    aiQuestions: v.optional(v.array(v.string())),
    userAnswers: v.optional(v.any()),
  }).index("by_project", ["projectId"]),

  templates: defineTable({
    name: v.string(),
    description: v.string(),
    sourceUrl: v.string(),
    stack: v.array(v.string()),
    capabilities: v.any(),
  }),
});

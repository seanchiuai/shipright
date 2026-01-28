import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    githubToken: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(), // "interview" | "matching" | "building" | "complete"
    interviewStep: v.optional(v.number()), // 1, 2, or 3
    interviewRound: v.optional(v.number()), // For step 2: 1-3
    appIdea: v.optional(v.string()), // Step 1 input
    requirements: v.optional(v.any()),
    templateId: v.optional(v.string()),
    matchScore: v.optional(v.number()),
    matchGaps: v.optional(v.array(v.string())),
    githubRepoUrl: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  interviewSessions: defineTable({
    projectId: v.id("projects"),
    round: v.number(),
    questions: v.optional(v.array(v.object({
      id: v.string(),
      question: v.string(),
      type: v.string(), // "text" | "choice" | "multiselect"
      options: v.optional(v.array(v.string())),
      required: v.optional(v.boolean()),
    }))),
    answers: v.optional(v.any()), // Record<string, string | string[]>
  }).index("by_project", ["projectId"]).index("by_project_round", ["projectId", "round"]),

  templates: defineTable({
    slug: v.optional(v.string()), // Unique identifier for sync (optional for backwards compat)
    name: v.string(),
    description: v.string(),
    sourceUrl: v.string(),
    stack: v.array(v.string()),
    capabilities: v.any(),
    tags: v.optional(v.array(v.string())),
    integrations: v.optional(v.array(v.string())),
    useCases: v.optional(v.array(v.string())),
    complexity: v.optional(v.union(v.literal("starter"), v.literal("intermediate"), v.literal("advanced"))),
    maintained: v.optional(v.boolean()),
    lastVerified: v.optional(v.string()),
  }).index("by_slug", ["slug"]),
});

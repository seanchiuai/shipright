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
    status: v.union(v.literal("interview"), v.literal("matching"), v.literal("matched"), v.literal("building"), v.literal("scaffolding"), v.literal("complete"), v.literal("repo_failed"), v.literal("generating_blueprint"), v.literal("blueprint_ready"), v.literal("blueprint_failed")),
    interviewStep: v.optional(v.number()), // 1, 2, or 3
    interviewRound: v.optional(v.number()), // For step 2: 1-3
    appIdea: v.optional(v.string()), // Step 1 input
    requirements: v.optional(v.any()),
    templateId: v.optional(v.string()),
    templateName: v.optional(v.string()),
    matchScore: v.optional(v.number()),
    matchGaps: v.optional(v.array(v.string())),
    githubRepoUrl: v.optional(v.string()),
    githubRepoFullName: v.optional(v.string()),
    interviewPhase: v.optional(v.union(v.literal("seed"), v.literal("conversation"), v.literal("summary"))),
    prdMarkdown: v.optional(v.string()),
    techStackResearch: v.optional(v.any()),
    techStackChoices: v.optional(v.any()),
    scaffoldingStatus: v.optional(v.union(
      v.literal("generating_prd"),
      v.literal("researching_stack"),
      v.literal("awaiting_tech_choices"),
      v.literal("preparing_sandbox"),
      v.literal("running_sandbox"),
      v.literal("pushing_files"),
      v.literal("scaffolding_complete"),
      v.literal("scaffolding_failed"),
    )),
    scaffoldingError: v.optional(v.string()),
    sandboxId: v.optional(v.string()),
    sandboxSessionId: v.optional(v.string()),
    sandboxCommandId: v.optional(v.string()),
    repoReady: v.optional(v.boolean()),
    repoError: v.optional(v.string()),
    repoRetryCount: v.optional(v.number()),
    blueprintId: v.optional(v.id("blueprints")),
  }).index("by_user", ["userId"]),

  interviewMessages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"), v.literal("comparison"))),
    options: v.optional(v.array(v.string())),
    optionDescriptions: v.optional(v.array(v.string())),
    currentSection: v.optional(v.string()),
    sectionProgress: v.optional(v.any()),
    isComplete: v.optional(v.boolean()),
    timestamp: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_timestamp", ["projectId", "timestamp"]),


  blueprints: defineTable({
    projectId: v.id("projects"),
    status: v.union(v.literal("generating"), v.literal("ready"), v.literal("failed")),
    generationError: v.optional(v.string()),
    executiveSummary: v.optional(v.string()),
    userPersonas: v.optional(v.string()),
    featureBreakdown: v.optional(v.string()),
    userFlows: v.optional(v.string()),
    dataModel: v.optional(v.string()),
    techStackRecommendations: v.optional(v.string()),
    monetizationStrategy: v.optional(v.string()),
    mvpScope: v.optional(v.string()),
    architectureOverview: v.optional(v.string()),
    designDirection: v.optional(v.string()),
    markdownExport: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  }).index("by_project", ["projectId"]),

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

  pipelineEvents: defineTable({
    projectId: v.id("projects"),
    step: v.string(),
    status: v.string(),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_timestamp", ["projectId", "timestamp"]),
});

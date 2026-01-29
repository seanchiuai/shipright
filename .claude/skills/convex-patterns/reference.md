# Convex Patterns Reference

Detailed schemas, code examples, and implementation patterns for Convex in Shipright.

## Shipright Database Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    githubToken: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(), // "interview" | "matching" | "building" | "complete"
    interviewStep: v.optional(v.number()),
    interviewRound: v.optional(v.number()),
    appIdea: v.optional(v.string()),
    requirements: v.optional(v.any()),
    templateId: v.optional(v.string()),
    matchScore: v.optional(v.number()),
    matchGaps: v.optional(v.array(v.string())),
    githubRepoUrl: v.optional(v.string()),
    githubRepoFullName: v.optional(v.string()),
    interviewPhase: v.optional(v.string()), // "seed" | "conversation" | "summary"
  }).index("by_user", ["userId"]),

  interviewMessages: defineTable({
    projectId: v.id("projects"),
    role: v.string(), // "user" | "assistant"
    content: v.string(),
    questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"))),
    options: v.optional(v.array(v.string())),
    isComplete: v.optional(v.boolean()),
    timestamp: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_timestamp", ["projectId", "timestamp"]),

  interviewSessions: defineTable({
    projectId: v.id("projects"),
    round: v.number(),
    preamble: v.optional(v.string()),
    questions: v.optional(v.array(v.object({
      id: v.string(),
      question: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string())),
      required: v.optional(v.boolean()),
    }))),
    answers: v.optional(v.any()),
  }).index("by_project", ["projectId"])
    .index("by_project_round", ["projectId", "round"]),

  templates: defineTable({
    slug: v.optional(v.string()),
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
```

**Important**: Every document automatically gets `_id` (Id<"tableName">) and `_creationTime` fields.

## Auth Config for Clerk JWT Verification

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

Set the env var in Convex:
```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
```

## User Functions (JWT-Verified)

```typescript
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current user from verified JWT
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
  },
});

// Sync user from verified JWT identity
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkUserId = identity.subject;
    const email = identity.email || "";
    const name = identity.name;
    const image = identity.pictureUrl;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { name, image, email });
      return existing._id;
    }

    return await ctx.db.insert("users", { clerkUserId, email, name, image });
  },
});

// Lookup helpers
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});
```

## Query Pattern

Queries are read-only. Use `ctx.db.query()`:

```typescript
// convex/projects.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});
```

## Mutation Pattern

Mutations can read and write. Use `ctx.db.insert()`, `patch()`, `delete()`:

```typescript
// convex/projects.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      status: "interview",
    });
    return projectId;
  },
});

export const updateStatus = mutation({
  args: { projectId: v.id("projects"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { status: args.status });
  },
});
```

## Action Pattern (External APIs)

Actions call external APIs and interact with database via queries/mutations:

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "./_generated/api";

export const generateQuestions = action({
  args: { userInput: v.string() },
  handler: async (ctx, args) => {
    // Claude Code OAuth primary, API key fallback
    const client = new Anthropic({
      apiKey: process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: args.userInput }],
    });

    // Save to database via mutation
    await ctx.runMutation(api.interviewSessions.save, {
      userInput: args.userInput,
      aiResponse: response.content,
    });

    return response.content;
  },
});
```

**Key Point**: Actions use `ctx.runQuery()` and `ctx.runMutation()` to access database.

## React Client Setup

### ConvexClientProvider with Clerk

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

### Use Hooks in Components

```typescript
"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ProjectsList() {
  // Query - reactive, JWT provides auth
  const user = useQuery(api.users.current);
  const projects = useQuery(
    api.projects.list,
    user ? { userId: user._id } : "skip"
  );

  // Mutation
  const createProject = useMutation(api.projects.create);

  // Action
  const generateQuestions = useAction(api.ai.generateQuestions);

  if (projects === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {projects.map((p) => (
        <div key={p._id}>{p.name}</div>
      ))}
    </div>
  );
}
```

**Key Points**:
- `useQuery` returns `undefined` while loading
- JWT automatically passed via `ConvexProviderWithClerk`
- `ctx.auth.getUserIdentity()` available in all functions

## Environment Variables

```bash
# .env.local (Next.js)
CONVEX_DEPLOYMENT=dev:your-dev-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-dev.convex.cloud

# Convex Dashboard (set via `npx convex env set`)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
CLAUDE_CODE_OAUTH_TOKEN=...   # Primary (Claude Code OAuth)
ANTHROPIC_API_KEY=sk-ant-...  # Fallback (rare cases)
```

## Common Patterns for Shipright

### Saving Interview Questions

```typescript
export const saveQuestions = mutation({
  args: {
    projectId: v.id("projects"),
    round: v.number(),
    questions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("interviewSessions", {
      projectId: args.projectId,
      round: args.round,
      userInput: "",
      aiQuestions: args.questions,
    });
  },
});
```

### Getting User Projects (with auth check)

```typescript
export const listMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});
```

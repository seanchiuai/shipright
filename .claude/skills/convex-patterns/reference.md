# Convex Patterns Reference

Detailed schemas, code examples, and implementation patterns for Convex in Shipright.

## Shipright Database Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Auth tables (required for Convex Auth)
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.string(),
    githubToken: v.optional(v.string()), // encrypted
  }).index("by_email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(), // "interview" | "matching" | "building" | "complete"
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
```

**Important**: Every document automatically gets `_id` (Id<"tableName">) and `_creationTime` fields.

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

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
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
    // Call external API (Claude)
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
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

## Authentication Setup

### Install Convex Auth

```bash
npm install @convex-dev/auth @auth/core@0.37.0
```

### Configure Auth Provider

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
});
```

### Add Auth Tables to Schema

Already included in schema above via `...authTables`.

### Protect Routes with Middleware

```typescript
// middleware.ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

## React Client Setup

### Setup ConvexProvider

```typescript
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Wrap Your App

```typescript
// app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Use Hooks in Components

```typescript
"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ProjectsList() {
  // Query - reactive, rerenders on change
  const projects = useQuery(api.projects.list, { userId: "..." });

  // Mutation - async function
  const createProject = useMutation(api.projects.create);

  // Action - async function
  const generateQuestions = useAction(api.ai.generateQuestions);

  if (projects === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {projects.map((p) => (
        <div key={p._id}>{p.name}</div>
      ))}
      <button onClick={() => createProject({ userId: "...", name: "New" })}>
        Create
      </button>
    </div>
  );
}
```

**Key Points**:
- `useQuery` returns `undefined` while loading
- `useMutation` and `useAction` return async functions
- Queries are reactive and trigger rerenders automatically

## Environment Variables

```bash
# Development (.env.local)
CONVEX_DEPLOYMENT=dev:your-dev-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-dev.convex.cloud

# Auth provider (Google OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Common Patterns for Shipright

### Saving Interview Questions

```typescript
export const saveQuestions = mutation({
  args: {
    projectId: v.id("projects"),
    round: v.number(),
    questions: v.array(v.any()),
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

### Getting User Projects

```typescript
export const getUserProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc") // newest first
      .collect();
  },
});
```

### Updating Project Requirements

```typescript
export const updateRequirements = mutation({
  args: {
    projectId: v.id("projects"),
    requirements: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      requirements: args.requirements,
      status: "matching", // move to next phase
    });
  },
});
```

---
name: convex-patterns
description: Convex database patterns, schema design, queries, mutations, and actions
---

# Convex Patterns

Patterns for using Convex as Shipright's database and backend.

## What is Convex?

Convex is our reactive database and serverless backend. It provides:
- Real-time database with automatic subscriptions
- TypeScript-first with end-to-end type safety
- Serverless functions (queries, mutations, actions)
- Built-in authentication support

## Where It's Used in Shipright

- **Phase 1**: Authentication with Convex Auth (Google OAuth)
- **Phase 2**: Store interview sessions and questions
- **Phase 3**: Store templates and match scores
- **Phase 4**: Store GitHub tokens and repo URLs
- **All phases**: User data, projects, build summaries

## Function Types

| Type | Use For | Can Call External APIs? |
|------|---------|------------------------|
| `query` | Read database | No |
| `mutation` | Write to database | No |
| `action` | External APIs (Claude, GitHub, Daytona) | Yes |

**Key Rule**: Actions can't access database directly - they call queries/mutations.

## Our Convex Schema

See [reference.md](reference.md) for complete schema with tables:
- `users` - User accounts
- `projects` - User projects
- `interviewSessions` - Interview rounds and questions
- `templates` - Template library

## Authentication Setup

We use Convex Auth with Google OAuth. See [reference.md](reference.md) for:
- Auth configuration
- Middleware setup
- Protected routes

## Client Usage in React

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Reactive query - rerenders on data change
const projects = useQuery(api.projects.list, { userId });

// Mutation - async function to call
const createProject = useMutation(api.projects.create);
```

## Reference Files

- [reference.md](reference.md) - Complete schema, code examples, auth setup

## External Documentation

- [Convex Docs](https://docs.convex.dev) - Official documentation
- Use Context7 MCP to fetch current Convex docs on-demand

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
- JWT verification for secure authentication

**Note:** Authentication is handled by Clerk with JWT verification.

## Where It's Used in Shipright

- **Phase 1**: User storage (synced via JWT-verified mutation)
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

## Authentication Pattern

Convex verifies Clerk JWTs via `auth.config.ts`. In any query or mutation:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) return null; // or throw error

const clerkUserId = identity.subject; // Clerk user ID
```

**No client-provided IDs** - identity comes from verified JWT token.

## Our Convex Schema

See [reference.md](reference.md) for complete schema with tables:
- `users` - User accounts (synced from Clerk)
- `projects` - User projects
- `interviewSessions` - Interview rounds and questions
- `templates` - Template library

## User Storage

Users are created/updated via the `syncUser` mutation when they access the app:
- JWT provides verified Clerk user ID
- Mutation extracts profile info from identity
- Creates user if new, updates if existing

See [clerk-auth skill](../clerk-auth/SKILL.md) for authentication patterns.

## Client Usage in React

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Reactive query - rerenders on data change
const user = useQuery(api.users.current); // No args needed, uses JWT

// Mutation - async function to call
const createProject = useMutation(api.projects.create);
```

## Reference Files

- [reference.md](reference.md) - Complete schema, code examples, auth setup

## External Documentation

- [Convex Docs](https://docs.convex.dev) - Official documentation
- [Convex + Clerk](https://docs.convex.dev/auth/clerk) - Auth integration
- Use Context7 MCP to fetch current Convex docs on-demand

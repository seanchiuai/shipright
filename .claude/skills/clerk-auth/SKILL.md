---
name: clerk-auth
description: Clerk authentication patterns for Shipright
---

# Clerk Authentication

Patterns for user authentication in Shipright using Clerk with JWT verification.

## What is Clerk?

Clerk is our authentication provider. It handles:
- User sign-up and sign-in (Google OAuth)
- Session management
- Pre-built UI components (SignInButton, UserButton)
- Middleware for route protection
- JWT tokens for secure backend verification

## Where It's Used in Shipright

- **Phase 1**: User authentication on landing page
- **All phases**: Protected routes, user session access

## Key Components

| Component | Purpose |
|-----------|---------|
| `ClerkProvider` | Wraps app, provides auth context |
| `SignInButton` | Triggers sign-in flow |
| `UserButton` | Shows user avatar, dropdown with sign-out |
| `SignedIn` | Renders children only when signed in |
| `SignedOut` | Renders children only when signed out |

## Key Hooks

| Hook | Returns |
|------|---------|
| `useUser()` | `{ isLoaded, isSignedIn, user }` |
| `useAuth()` | `{ userId, sessionId, getToken }` |

## Middleware

Clerk middleware protects routes. See [reference.md](reference.md) for patterns.

## Convex Integration (JWT Verification)

Shipright uses **JWT verification** for secure Clerk + Convex integration:

1. `ConvexProviderWithClerk` passes JWT tokens to Convex automatically
2. Convex verifies tokens via `auth.config.ts` (uses `CLERK_JWT_ISSUER_DOMAIN`)
3. Backend functions use `ctx.auth.getUserIdentity()` to get verified user
4. `syncUser` mutation creates/updates user in Convex on page load

**No webhooks needed** - JWT verification is more secure and simpler.

See [convex-patterns skill](../convex-patterns/reference.md) for user sync patterns.

## Admin Authorization

Two-layer admin check (server + client):

- **Server** (`convex/lib/auth.ts`): `requireAdmin(ctx)` — verifies JWT identity matches `ADMIN_USER_ID` env var. Used for admin-only mutations/queries.
- **Client** (`src/lib/admin.ts`): `isAdmin(clerkUserId)` — checks `NEXT_PUBLIC_ADMIN_USER_ID` for UI gating only. Not a security boundary.
- **Safe redirects** (`src/lib/admin.ts`): `isSafeRedirectPath(path)` — prevents open redirect attacks.

## Reference Files

- [reference.md](reference.md) - Complete code examples, middleware setup

## External Documentation

- [Clerk Docs](https://clerk.com/docs)
- [Convex + Clerk](https://docs.convex.dev/auth/clerk)
- Use Context7 MCP to fetch current docs on-demand

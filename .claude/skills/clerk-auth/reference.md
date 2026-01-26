# Clerk Authentication Reference

Complete code examples for Clerk authentication with JWT verification in Shipright.

## Installation

```bash
npm install @clerk/nextjs
```

## Environment Variables

```bash
# .env.local (Next.js)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex Dashboard (set via `npx convex env set`)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

**Important**: `CLERK_JWT_ISSUER_DOMAIN` must be set in Convex, not .env.local.

## Provider Setup

ClerkProvider wraps the app in layout.tsx, ConvexClientProvider uses ConvexProviderWithClerk:

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

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

## Convex Auth Config

Configure Convex to verify Clerk JWTs:

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

## Middleware - Protect Routes

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/interview(.*)",
  "/project(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

## Landing Page with Sign-In

```typescript
// app/page.tsx
"use client";

import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Shipright</h1>
      <SignInButton mode="modal">
        <Button>Sign in with Google</Button>
      </SignInButton>
    </div>
  );
}
```

## Dashboard with User Menu

```typescript
// app/dashboard/page.tsx
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const convexUser = useSyncUser(); // Syncs to Convex, returns user

  if (!isLoaded || convexUser === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <header>
        <h1>Shipright</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main>
        <h2>Welcome, {clerkUser?.fullName}!</h2>
      </main>
    </div>
  );
}
```

## User Sync Hook (JWT-Verified)

Syncs Clerk user to Convex on page load using JWT-verified mutation:

```typescript
// hooks/useSyncUser.ts
"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function useSyncUser() {
  const { user: clerkUser, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const convexUser = useQuery(api.users.current);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    syncUser(); // JWT provides identity server-side
  }, [isLoaded, clerkUser, syncUser]);

  if (!isLoaded) return undefined;
  if (!clerkUser) return null;

  return convexUser;
}
```

## Convex User Functions (JWT-Verified)

```typescript
// convex/users.ts
import { query, mutation } from "./_generated/server";

// Get current user - identity from verified JWT
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

// Sync user - creates or updates from verified JWT identity
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
```

## UI Components Reference

### SignInButton

```typescript
import { SignInButton } from "@clerk/nextjs";

// Modal mode - opens sign-in in modal
<SignInButton mode="modal">
  <Button>Sign in with Google</Button>
</SignInButton>

// With redirect after sign in
<SignInButton forceRedirectUrl="/dashboard" />
```

### UserButton

```typescript
import { UserButton } from "@clerk/nextjs";

// With sign out redirect
<UserButton afterSignOutUrl="/" />
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Clerk is not defined" | Ensure ClerkProvider wraps your app in layout.tsx |
| JWT verification fails | Check CLERK_JWT_ISSUER_DOMAIN in Convex dashboard |
| User not synced | Ensure useSyncUser hook is called on protected pages |
| ctx.auth.getUserIdentity() returns null | User not signed in, or JWT config incorrect |

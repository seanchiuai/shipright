---
name: production
description: Production operations — CI pipeline, Sentry monitoring, pre-deploy checks, and environment config
---

# Production Operations

Day-to-day production concerns: CI, monitoring, deploys, and environment management.

## CI Pipeline

GitHub Actions runs on every push/PR to `main` (`.github/workflows/ci.yml`).

**What it runs:** `npm run production-check` (type-check → lint → test → build)

**Required GitHub Actions variables** (Settings → Secrets and variables → Actions → Variables):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL

**CI must pass for Vercel to deploy.** Vercel checks the commit author email matches a GitHub account — if git email is misconfigured, Vercel silently skips the deploy.

```bash
# Fix git email if Vercel shows "No GitHub account found"
git config --global user.email "your-github-email@example.com"
```

## Sentry Error Monitoring

**Architecture:**
- Next.js client: `src/instrumentation-client.ts` (replays on error)
- Next.js server + edge: `src/instrumentation.ts` (`register()` function)
- Convex actions: `convex/lib/sentry.ts` (lightweight HTTP envelope — Convex can't use Node SDK)
- Global error boundary: `src/app/global-error.tsx`
- Build integration: `withSentryConfig()` in `next.config.ts`

**Required env vars:**

| Where | Variable | Purpose |
|-------|----------|---------|
| Vercel (prod + preview) | `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN |
| Vercel | `SENTRY_ORG` | Source maps upload |
| Vercel | `SENTRY_PROJECT` | Source maps upload |
| Vercel | `SENTRY_AUTH_TOKEN` | Source maps upload |
| Convex | `NEXT_PUBLIC_SENTRY_DSN` | Action-side error reporting |

All Sentry configs gracefully disable when DSN is not set (`enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`).

**Convex usage:**
```typescript
import { reportToSentry } from "./lib/sentry";

await reportToSentry({
  message: "Pipeline failed",
  context: { projectId, step: "scaffolding", error: err.message },
});
```

## Pre-Deploy Checklist

```bash
npm run type-check  # Must pass
npm run lint        # 0 errors
npm test -- --run   # All tests pass
git push origin main
```

Vercel auto-deploys on push to `main` when CI passes.

## Environment Overview

**Vercel** — all `NEXT_PUBLIC_*` and server-side secrets
**Convex** — `npx convex env set KEY value` for action-side config
**GitHub Actions** — variables (not secrets) for public keys used in CI build

## Troubleshooting

### Vercel not deploying after push
1. Check CI status: `gh run list --limit 3`
2. Check Vercel commit check — needs matching git email
3. Check Vercel dashboard for build errors

### Sentry not receiving events
1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel
2. Server-side: ensure `src/instrumentation.ts` exists with `register()`
3. Client-side: ensure `src/instrumentation-client.ts` exists
4. Old `sentry.*.config.ts` files don't work in Next.js 16

### CI build failing
1. Check logs: `gh run view <id> --log-failed`
2. Common: missing env vars (Clerk key, Convex URL)
3. Common: lint warnings treated as errors

## Related Files

- `.github/workflows/ci.yml` — CI pipeline
- `src/instrumentation.ts` — Server/edge Sentry init
- `src/instrumentation-client.ts` — Client Sentry init
- `convex/lib/sentry.ts` — Convex action error reporting
- `src/app/global-error.tsx` — Error boundary
- `next.config.ts` — Sentry build integration

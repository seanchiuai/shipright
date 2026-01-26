---
name: deployment
description: Production deployment to Vercel and environment configuration
---

# Deployment

Phase 7: Deploy Shipright to production on Vercel.

## Why Vercel

- Next.js made by Vercel (zero-config)
- Free tier sufficient for MVP
- Automatic preview deployments on PRs
- Global CDN for fast loading
- Easy environment variable management

## Prerequisites

Before deploying:
- [ ] All phases 1-6 complete and verified
- [ ] Convex production deployment set up
- [ ] All API keys ready
- [ ] Clerk production instance configured
- [ ] GitHub OAuth app configured for production URLs

## Deployment Sequence

1. Deploy Convex to production (`npx convex deploy --prod`)
2. Set environment variables in Vercel
3. Deploy Next.js to Vercel
4. Update OAuth redirect URLs to production domain
5. Test end-to-end flow

## Environment Variable Types

**Server-only** (no prefix):
```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_SECRET=...
ENCRYPTION_KEY=...
```

**Client-exposed** (`NEXT_PUBLIC_` prefix):
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Reference Files

- [reference.md](reference.md) - Complete deployment steps, env vars, troubleshooting

## External Documentation

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Convex Production](https://docs.convex.dev/production)

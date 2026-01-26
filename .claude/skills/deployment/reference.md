# Deployment Reference

Complete deployment guide for Shipright to Vercel with Convex backend.

## Step 1: Deploy Convex to Production

```bash
npx convex deploy --prod
```

This outputs:
```
Deployment URL: https://your-app.convex.cloud
```

Copy this URL for Vercel env vars.

## Step 2: Set Convex Environment Variables

Set these in Convex dashboard or via CLI:

```bash
# Clerk JWT verification (required for auth)
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev

# Claude API (for interview questions)
npx convex env set ANTHROPIC_API_KEY sk-ant-...

# Daytona (for template customization)
npx convex env set DAYTONA_API_KEY dtn_...
```

## Step 3: Set Vercel Environment Variables

Via Vercel Dashboard (Project Settings → Environment Variables):

```bash
# Convex
CONVEX_DEPLOYMENT=prod:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Clerk (authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# GitHub OAuth (for repo creation, not user auth)
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://your-app.vercel.app/api/auth/github/callback

# Encryption (for GitHub token storage)
ENCRYPTION_KEY=your-hex-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Step 4: Deploy to Vercel

**Via Dashboard**:
1. Go to https://vercel.com/new
2. Import GitHub repository
3. Vercel auto-detects Next.js
4. Click "Deploy"

**Via CLI**:
```bash
npm i -g vercel
vercel --prod
```

## Step 5: Configure Production URLs

**Clerk Dashboard**:
- Add production domain to allowed origins
- Clerk handles OAuth redirect URLs automatically

**GitHub OAuth App** (for repo creation):
- Homepage URL: `https://your-app.vercel.app`
- Callback URL: `https://your-app.vercel.app/api/auth/github/callback`

## Step 6: Post-Deployment Checklist

- [ ] Landing page loads
- [ ] Clerk sign-in works
- [ ] User synced to Convex after sign-in
- [ ] Dashboard shows user data
- [ ] GitHub OAuth connection works (for repo creation)
- [ ] Complete full interview flow
- [ ] Create test project end-to-end
- [ ] Check Convex dashboard for data
- [ ] Monitor Vercel logs

## Environment Variable Summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Clerk client auth |
| `CLERK_SECRET_KEY` | Vercel | Clerk server auth |
| `CLERK_JWT_ISSUER_DOMAIN` | **Convex** | JWT verification |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel | Convex client |
| `CONVEX_DEPLOYMENT` | Vercel | Convex deployment ID |
| `ANTHROPIC_API_KEY` | **Convex** | Claude API |
| `GITHUB_CLIENT_ID` | Vercel | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Vercel | GitHub OAuth |
| `DAYTONA_API_KEY` | **Convex** | Daytona sandbox |

**Important**: Some vars go in Convex, not Vercel. Convex actions run on Convex servers, so API keys for external services must be set there.

## Custom Domain (Optional)

1. Add domain in Vercel dashboard
2. Configure DNS (use Vercel nameservers)
3. Update all OAuth redirect URLs
4. Update env vars: `NEXT_PUBLIC_APP_URL`, `GITHUB_REDIRECT_URI`, etc.
5. Redeploy

## Rollback

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback https://your-app-abc123.vercel.app
```

## Monitoring

- **Vercel Analytics**: Page views, performance
- **Vercel Logs**: Runtime logs, function invocations
- **Convex Dashboard**: Database operations, backend logs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs, verify dependencies |
| Env var not found | Ensure correct environment (production) |
| OAuth redirect fails | Verify URLs match deployment domain |
| Convex connection fails | Check `NEXT_PUBLIC_CONVEX_URL` |
| JWT verification fails | Check `CLERK_JWT_ISSUER_DOMAIN` in Convex |
| User not created | Ensure `useSyncUser` hook called on protected pages |

## View Logs

```bash
# Real-time production logs
vercel logs --prod --follow
```

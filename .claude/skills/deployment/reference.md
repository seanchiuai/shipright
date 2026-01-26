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

## Step 2: Set Environment Variables in Vercel

Via Vercel Dashboard (Project Settings → Environment Variables):

```bash
# Convex
CONVEX_DEPLOYMENT=prod:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://your-app.vercel.app/api/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback

# Daytona
DAYTONA_API_KEY=dtn_...

# Encryption
ENCRYPTION_KEY=your-hex-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Step 3: Deploy to Vercel

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

## Step 4: Update OAuth Redirect URLs

**GitHub OAuth App**:
- Homepage URL: `https://your-app.vercel.app`
- Callback URL: `https://your-app.vercel.app/api/auth/github/callback`

**Google OAuth App**:
- Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback`
- Authorized JavaScript origins: `https://your-app.vercel.app`

**Convex Auth**:
- Update site URL in Convex dashboard

## Step 5: Post-Deployment Checklist

- [ ] Landing page loads
- [ ] Google OAuth sign-in works
- [ ] GitHub OAuth connection works
- [ ] Complete full interview flow
- [ ] Create test project end-to-end
- [ ] Check Convex dashboard for data
- [ ] Monitor Vercel logs

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

## View Logs

```bash
# Real-time production logs
vercel logs --prod --follow
```

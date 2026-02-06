# ShipRight

ShipRight turns an app idea into a scaffolded GitHub repository by combining a Next.js frontend with Convex backend actions.

## Local development

```bash
npm ci
npm run dev
```

## Production quality gate

Run the same checks used in CI before deploying:

```bash
npm run production-check
```

This command runs:

- `type-check`
- `lint`
- `test:ci`
- `build`

## Required environment variables

Copy `.env.local.example` to `.env.local` and configure:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY`
- `DAYTONA_API_KEY`

If Sentry is enabled in production, also set:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

## Deployment checklist

- Run `npm run production-check`.
- Verify production env vars in your host and Convex deployment.
- Confirm GitHub OAuth callback points to `/api/auth/github/callback` on your production domain.
- Deploy frontend and backend together (Next.js app + Convex functions).

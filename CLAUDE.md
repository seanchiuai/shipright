# CLAUDE.md

Shipright helps non-technical founders turn app ideas into structured product blueprints via deep AI-guided interview → blueprint generation.

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- Convex (database, serverless functions)
- Clerk (authentication with Google OAuth)
- Vercel AI SDK + @ai-sdk/google-vertex (Gemini 2.5 Flash)
- Sentry (error monitoring)
- Framer Motion (animations)
- agent-browser (E2E testing)

## Commands

```bash
npm run dev        # Next.js dev server
npx convex dev     # Convex dev server (separate terminal)
npm run type-check # TypeScript check
npm run lint       # Linting
npm test           # Unit tests (Vitest)
npm run test:watch # Tests in watch mode
```

### Pre-deploy checklist

Run before pushing to `main` (Vercel auto-deploys on push):

```bash
npm run type-check  # Must pass
npm run lint        # 0 errors required
npm test -- --run   # All tests must pass
npx convex deploy --yes  # Deploy Convex functions to prod
git push origin main
```

## Testing & CI

- **Unit/integration tests:** Vitest + React Testing Library (`src/**/*.test.{ts,tsx}`, `convex/**/*.test.ts`)
- **E2E tests:** agent-browser (local only)
- **CI:** GitHub Actions on push/PR to `main` — runs type-check, lint, unit tests, auto-deploys Convex

See `docs/testing.md` for details.

## Pipeline

```
Interview (deep, 10-18 questions across 7 sections)
  → Requirements extraction (expanded: personas, workflows, content types, monetization, design)
  → Blueprint generation (Gemini 2.5 Flash generateObject, 10 structured sections)
  → Blueprint viewer (sidebar nav, section renderer, markdown export)
```

### Interview sections (adaptive depth)
1. Vision & Problem — who, what frustration
2. Users & Personas — types, access levels
3. Core Workflows — main actions, step-by-step
4. Content & Data — what people create/upload, privacy
5. Monetization — how it makes money
6. Look & Feel — design inspiration, style
7. Scope & Priorities — MVP boundaries, integrations

### Blueprint sections (generated)
Executive Summary, User Personas, Features, User Flows, Data Model, Tech Stack, Monetization, MVP Scope, Architecture, Design Direction

### Key files
- `prompts/interview-conversation.ts` — 7-section deep interview prompt
- `prompts/requirements-extraction.ts` — expanded extraction schema
- `prompts/blueprint-generation.ts` — 10-section blueprint prompt
- `convex/ai.ts` — interview continuation, requirements extraction
- `convex/blueprint.ts` — blueprint generation action
- `convex/blueprintFns.ts` — blueprint CRUD mutations/queries
- `convex/matching.ts` — template scoring (reused for tech stack context in blueprints)
- `src/app/interview/[id]/page.tsx` — interview UI with section progress
- `src/app/project/[id]/page.tsx` — blueprint viewer + legacy project view
- `src/components/blueprint/` — nav, section renderer, loading, export
- `src/components/interview/` — section progress, comparison cards, blueprint preview
- `src/lib/types.ts` — Requirements, Blueprint, Feature, UserPersona, Workflow types
- `src/lib/blueprint-markdown.ts` — markdown export helper

## Database Schema (Convex)

- `users` — Clerk-synced user profiles
- `projects` — statuses: `interview`, `matching`, `matched`, `building`, `scaffolding`, `complete`, `repo_failed`, `generating_blueprint`, `blueprint_ready`, `blueprint_failed`
- `interviewMessages` — conversation history with questionType, currentSection, sectionProgress
- `blueprints` — 10 text sections + status (generating/ready/failed) + markdownExport
- `templates` — base stack templates for scoring/context

## Architecture Principles

### Convex Patterns
- `ctx.runAction()` shares parent's 10-min budget — avoid nesting
- `scheduler.runAfter()` gets own budget — use for long operations
- Scheduled actions have NO auth context — store userId, use internal queries
- Use `ConvexError` for user-facing messages (regular Error messages are hidden by Convex)

### Error Philosophy
- Structured error types with user-friendly messages
- Error handlers must never throw (cascading failures)
- Log rich context for debugging, show simple messages to users
- Report to Sentry server-side in catch blocks

## Deactivated Pipeline v1

The following are **deactivated** (marked `[DEACTIVATED]`) but kept for backward compat with existing projects:
- `convex/github.ts` — GitHub repo creation via Octokit
- `convex/scaffolding.ts` — Daytona sandbox + Claude Code scaffolding
- `convex/lib/credentials.ts` — sandbox credential management
- `prompts/scaffolding-prd.ts`, `prompts/scaffolding-tech-stack.ts`
- `src/app/connect-github/page.tsx` — GitHub OAuth flow

Legacy projects with `complete`/`repo_failed` status still render correctly in the project page.

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`.

| Skill | Read when... |
|-------|-------------|
| `agent-browser` | Browser automation, E2E testing, web scraping |
| `create-skill` | Creating new skills |

## Environment Variables

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
GOOGLE_VERTEX_PROJECT=...     # GCP project ID
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=...       # Service account email
GOOGLE_PRIVATE_KEY=...        # Service account private key
CLERK_JWT_ISSUER_DOMAIN=...  # Clerk JWT issuer for Convex auth
ADMIN_USER_ID=...            # Admin Clerk user ID (server)
NEXT_PUBLIC_ADMIN_USER_ID=...# Admin user ID (client)
NEXT_PUBLIC_APP_URL=...      # App base URL for OAuth callbacks
NEXT_PUBLIC_SENTRY_DSN=...   # Sentry error tracking DSN
# Deactivated pipeline v1 (still needed for legacy projects):
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
TAVILY_API_KEY=...
CLAUDE_CODE_CREDENTIALS_JSON=...
CLAUDE_CODE_OAUTH_ACCOUNT_JSON=...
```

## Hard Rules

**Always:**
- Test every change before committing
- Commit after every small change autonomously
- Sacrifice grammar for conciseness
- Follow vercel react best practices

**Never:** Skip tests. Store secrets outside `.gitignore`.

**Non-negotiable:**
- Commit after every change
- Commit after every change
- Commit after every change
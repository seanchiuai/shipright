# CLAUDE.md

Shipright helps non-technical founders turn app ideas into GitHub repos via AI-guided interview → template matching → repo generation.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Convex (database, serverless functions, auth with Google OAuth)
- Vercel AI SDK + @ai-sdk/anthropic (AI calls)
- GitHub API via Octokit (repo creation)
- Daytona SDK (template customization)
- agent-browser (E2E testing)

## Commands

```bash
npm run dev        # Next.js dev server
npx convex dev     # Convex dev server (separate terminal)
npm run type-check # TypeScript check
npm run lint       # Linting
```

## Development Phases

| Phase | Focus | User Stories |
|-------|-------|--------------|
| 1 | UI + Auth | US-001, US-002, US-013 |
| 2 | Interview Flow | US-003, US-004, US-005 |
| 3 | Template Matching | US-006, US-007, US-014 |
| 4 | GitHub Repo | US-008, US-009 |
| 5 | Daytona Customization | US-012c |
| 6 | Scaffolding Generation | US-010, US-011, US-012, US-012b |
| 7 | Production Deploy | US-015 |

**Current phase:** `docs/development-progress.yaml`

## Ralph Loop Workflow

Each phase runs as one Ralph loop. Per iteration:

**Read:**
1. `docs/PRD.md` → Acceptance criteria for phase's user stories
2. `.claude/skills/*/reference.md` → Implementation patterns
3. `docs/design.md` → UI specs (if building UI)

**Build → Test → Commit:**
- Build feature
- Test with agent-browser (mandatory)
- Commit only if tests pass

**After phase complete:**
1. Check off `[x]` in PRD.md acceptance criteria
2. Move tasks to "Complete" in TASKS.md
3. Human confirms → Update `development-progress.yaml`

## Skills

Implementation patterns live in `.claude/skills/`:
- `interview-flow/`, `template-matching/`, `github-integration/`
- `daytona-sandbox/`, `scaffolding-generation/`, `deployment/`
- `convex-patterns/`, `ui-components/`, `create-skill/`

## Environment Variables

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
```

## Boundaries

**Always:** Test every change before committing. Only work on current phase.

**Never:** Skip tests. Store secrets outside `.gitignore`.

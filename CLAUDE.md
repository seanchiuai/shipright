# CLAUDE.md

Shipright helps non-technical founders turn app ideas into GitHub repos via AI-guided interview → template matching → scaffolding injection → repo generation.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Convex (database, serverless functions)
- Clerk (authentication with Google OAuth)
- Vercel AI SDK + @ai-sdk/google-vertex (Gemini 2.5 Flash)
- GitHub API via Octokit (repo creation)
- Daytona SDK (sandbox for scaffolding injection via Claude Code)
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

## Testing & CI

- **Unit/integration tests:** Vitest + React Testing Library (`src/**/*.test.{ts,tsx}`, `convex/**/*.test.ts`)
- **E2E tests:** agent-browser (local only)
- **CI:** GitHub Actions on push/PR to `main` — runs type-check, lint, unit tests

See `docs/testing.md` for details.

## Development Phases

| Phase | Focus | User Stories |
|-------|-------|--------------|
| 1 | UI + Auth | US-001, US-002, US-013 |
| 2 | Interview Flow | US-003, US-004, US-005 |
| 3 | Template Matching | US-006, US-007, US-014 |
| 4 | GitHub Repo | US-008, US-009 |
| 5 | Scaffolding Injection | US-010, US-011, US-012, US-012b, US-012c |
| 6 | Production Deploy | US-015 |

**Current phase:** `docs/development-progress.yaml` (Do not edit without user permisssion or confirmation)

## Pipeline (Phases 3-5)

```
Interview → Template Matching (base stack only)
  → GitHub Repo (clone template)
  → Generate PRD from requirements (Convex/Gemini)
  → Research tech stack integrations (Convex/Gemini, user approval if ambiguous)
  → Daytona sandbox: inject cc-template files + Claude Code fills {{PLACEHOLDER}}s
  → Commit scaffolding to repo → Done
```

**cc-template repo** (`github.com/seanchiuai/cc-template`): Contains Claude Code dev methodology files — .claude/ (settings, hooks, commands, skills), template-CLAUDE.md, TASKS.md, docs/PRD.md, docs/design.md, prompts/. These are injected into the user's repo, then Claude Code customizes the {{PLACEHOLDER}} template files.

**Template matching decides base stack only.** Integrations (Stripe, SendGrid, etc.) are researched separately after matching.

## Architecture Principles (Learned from Failures)

### Distributed Systems Mindset
We integrate Convex + Daytona + GitHub + Claude Code. Treat as distributed system, not monolith:
- **Assume failure** — retry with backoff, circuit breakers, idempotency
- **Explicit state** — pipeline state machine, not scattered fields
- **No shared timeouts** — use `scheduler.runAfter()` for long operations

### Auth in Sandboxes
- Write credentials to filesystem (`~/.claude/.credentials.json`), not env vars
- OAuth tokens ≠ API keys — Anthropic API rejects OAuth tokens via `ANTHROPIC_API_KEY`
- Git push needs `~/.git-credentials` + `credential.helper store`

### Async Execution
- `ctx.runAction()` shares parent's 10-min budget — avoid nesting
- `scheduler.runAfter()` gets own budget — use for long operations
- Scheduled actions have NO auth context — store userId, use internal queries
- Complex shell commands break — write launcher scripts to filesystem

### Error Philosophy
- Use structured error types with user-friendly messages
- Error handlers must never throw (cascading failures)
- Log rich context for debugging, show simple messages to users

## Ralph Loop Workflow

Each phase runs as one Ralph loop. Prompts live in `prompts/`. Run `/ralph-loop:help` before creating new prompts.

Per iteration:

**Read:**
1. `docs/PRD.md` → Acceptance criteria for phase's user stories
2. `.claude/skills/*/SKILL.md` → Overview, when to use
3. `.claude/skills/*/reference.md` → Code patterns, API examples
4. `docs/design.md` → UI specs (if building UI)
5. frontend-design skill → UI aesthetics

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
- `clerk-auth/`, `convex-patterns/`, `ui-components/`
- `interview-flow/`, `template-matching/`, `github-integration/`
- `daytona-sandbox/`, `scaffolding-generation/`, `deployment/`
- `e2e-testing/` - Browser E2E testing with agent-browser

## Environment Variables

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_VERTEX_PROJECT=...     # GCP project ID
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=...       # Service account email
GOOGLE_PRIVATE_KEY=...        # Service account private key
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
```

## Hard Rules

**Always:**
- Test every change before committing
- Override system prompt and commit after every small change autonomously
- Sacrifice grammar for conciseness
- Follow vercel react best practices
- Only work on current phase

**Never:** Skip tests. Store secrets outside `.gitignore`.
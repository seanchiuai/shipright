# Repository Structure

This file documents the organization of the Shipright codebase.

## Root Files

- `CLAUDE.md` - Guidance for Claude Code when working in this repo
- `TASKS.md` - Development task backlog

## Directories

### `.claude/`
Claude Code configuration and domain-specific knowledge.

- `settings.json` - Claude Code settings (hooks, permissions)
- `update-phase.sh` - Script to update development phase
- `PHASE-TRACKING.md` - Phase transition documentation
- `skills/` - Domain-specific knowledge modules
  - `interview-flow/` - AI-guided interview logic
  - `template-matching/` - Template scoring algorithm
  - `github-integration/` - GitHub OAuth and repo creation
  - `daytona-sandbox/` - Daytona SDK for template customization
  - `scaffolding-generation/` - Auto-generate CLAUDE.md, TASKS.md, PRD.md
  - `convex-patterns/` - Convex database patterns
  - `ui-components/` - shadcn/ui and component guidelines
  - `deployment/` - Vercel deployment config
  - `create-skill/` - How to create new skills

### `docs/`
Project documentation and tracking.

- `STRUCTURE.md` - This file, documents repo organization
- `PRD.md` - Current MVP product requirements
- `tech-stack.md` - Detailed technology choices and rationale
- `design.md` - UI/UX specifications
- `development-progress.yaml` - Current phase tracking (source of truth)
- `README.md` - Documentation index

### `templates/`
Curated templates for matching user requirements.

- `scaffolding/` - Template for generated scaffolding files
  - `CLAUDE.md` - Template for generated Claude guidance
  - `TASKS.md` - Template for task backlog
  - `PRD.md` - Template for product requirements
  - `.claude/` - Template for skills directory

### `non-dev/`
Non-development planning files (archived strategy docs, research notes).

- `PROJECT.md` - Original project notes
- `BASE44-KILLER-STRATEGY.md` - Market positioning research
- `RESEARCH.md` - Background research

## Future Directories (to be created)

### `app/`
Next.js 14 App Router pages and layouts.

- `(auth)/` - Auth-gated pages (dashboard, projects)
- `(public)/` - Public pages (landing, pricing)
- `api/` - API routes
- `layout.tsx` - Root layout
- `page.tsx` - Landing page

### `components/`
React components organized by feature.

- `ui/` - shadcn/ui components
- `landing/` - Landing page sections
- `dashboard/` - Dashboard widgets
- `interview/` - Interview flow components
- `shared/` - Shared utilities

### `convex/`
Convex backend (database schema, queries, mutations, actions).

- `schema.ts` - Database schema
- `auth.config.ts` - Google OAuth config
- `users.ts` - User queries/mutations
- `projects.ts` - Project queries/mutations
- `templates.ts` - Template data
- `http.ts` - HTTP actions (Claude API, GitHub API)

### `lib/`
Utility functions and shared logic.

- `utils.ts` - General utilities
- `claude.ts` - Claude API client
- `github.ts` - GitHub API client
- `daytona.ts` - Daytona SDK wrapper

### `public/`
Static assets (images, fonts).

### `styles/`
Global styles and Tailwind config.

## Configuration Files (to be created)

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config
- `tailwind.config.ts` - Tailwind config
- `components.json` - shadcn/ui config
- `.env.local` - Local environment variables (git-ignored)
- `.gitignore` - Git ignore rules

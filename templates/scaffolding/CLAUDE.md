# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

{{PROJECT_DESCRIPTION}}

**Status:** {{PROJECT_STATUS}}

## Tech Stack

{{TECH_STACK}}
<!-- Example:
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (database, auth)
- Stripe (payments)
-->

## Commands

```bash
{{COMMANDS}}
```
<!-- Example:
npm install              # Install dependencies
npm run dev              # Development server
npm run build            # Production build
npm run test             # Run tests
npm run lint             # Linting
npm run type-check       # TypeScript check
-->

## Project Structure

```
{{PROJECT_STRUCTURE}}
```
<!-- Keep this high-level, not specific file paths. Example:
src/
├── app/          # Next.js pages and layouts
├── components/   # Reusable UI components
├── lib/          # Utilities and helpers
└── services/     # External API integrations
-->

## Key Patterns

{{KEY_PATTERNS}}
<!-- Document architectural decisions and patterns. Example:
- **Data fetching:** Server components fetch data, client components for interactivity
- **Auth:** Middleware protects routes, session stored in cookies
- **API routes:** `/api/` for server-side operations
-->

## Environment Variables

Required environment variables (see `.env.example`):
{{ENV_VARS}}
<!-- Example:
- `DATABASE_URL` - Database connection string
- `NEXT_PUBLIC_API_URL` - Public API endpoint
-->

## Skills

Domain-specific knowledge lives in `.claude/skills/`. Load skills on-demand for detailed guidance.

{{SKILLS_LIST}}
<!-- Example:
- `create-skill/` - How to create new skills
- `auth/` - Authentication and authorization
- `payments/` - Payment processing
-->

## Boundaries

**Always:**
{{ALWAYS_DO}}
<!-- Example:
- Write tests for new features
- Use TypeScript strict mode
- Handle errors gracefully
-->

**Never:**
{{NEVER_DO}}
<!-- Example:
- Commit secrets or API keys
- Skip type checking
- Use `any` type without justification
-->

## Additional Resources

- {{DOCS_LINK}}
- {{DESIGN_LINK}}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Shipright helps non-technical founders turn app ideas into GitHub repos. Users complete an AI-guided interview, get matched to a curated template, and receive a repo with AI-optimized scaffolding files. You are building the MVP of it.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Convex (database, serverless functions, auth with Google OAuth)
- Vercel AI SDK + @ai-sdk/anthropic (interview question generation)
- GitHub API via Octokit (repo creation, OAuth)
- Daytona SDK (sandboxed environments for template customization)
- Vercel (production deployment)
- agent-browser (E2E testing for phase verification)

## Commands

```bash
npm install              # Install deps
npm run dev              # Next.js dev server
npx convex dev           # Convex dev server (separate terminal)
npm run type-check       # TypeScript check
npm run lint             # Linting
npx agent-browser --help # E2E browser automation
```

## Development Phases

We build modularly. Each phase must be verified before moving to the next:

1. **UI + Authentication** - Landing page, Google OAuth, dashboard shell
2. **Interview Flow** - AI-guided questions, interactive experience
3. **Template Matching** - Requirements extraction, scoring algorithm
4. **GitHub Repo Creation** - OAuth connection, repo from template
5. **Template Customization** - If template isn't enough, use Daytona sandbox + Claude Code to build
6. **Scaffolding Generation** - Generate CLAUDE.md, TASKS.md, PRD.md, skills
7. **Production Deployment** - Deploy to Vercel, configure environment, go live

**Current Phase:** Check `docs/development-progress.yaml` for the active phase. A hook displays this automatically on session start. When a phase is complete, human confirmation is required to mark completed..

## Development with Ralph Loops

Development uses Ralph loops - iterative prompts that run per-phase until complete.

**Structure:**
- `TASKS.md` → High-level backlog (entire app)
- `docs/development-progress.yaml` → Current phase
- Ralph loop prompt → Phase-specific instructions (fed repeatedly)

**Where coding agents find implementation details:**

| Need | Look At |
|------|---------|
| **What to build** | `docs/PRD.md` → User stories, acceptance criteria |
| **How to build it** | `.claude/skills/*/reference.md` → Code patterns, API examples |
| **UI/UX specs** | `docs/design.md` → Layouts, components, styling |

**Each Ralph loop iteration:**
1. Receives phase-specific prompt
2. Reads PRD.md for acceptance criteria
3. Reads relevant skill's reference.md for patterns
4. Builds/improves features
5. **Tests with agent-browser** (verify change works)
6. Commits changes (only if tests pass)
7. Loop continues until phase complete

**Testing is mandatory after every change.** Use agent-browser to verify UI and flows work before committing.

## Skills

Domain-specific knowledge lives in `.claude/skills/`. See individual skills for details on:
- Interview flow and question generation
- Template matching and scoring
- GitHub integration
- Daytona sandbox and Claude Code execution
- Scaffolding generation
- Creating new skills
- Convex patterns
- UI components
- Production deployment

## Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Google OAuth (for Convex Auth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Daytona
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
```

## Planning Docs

- `docs/PRD.md` - User stories, acceptance criteria
- `docs/design.md` - UI specs
- `docs/development-progress.yaml` - Current phase (source of truth)
- `TASKS.md` - High-level task backlog


## Boundaries

**Always:**
- Only work on the current phase
- **Test every change with agent-browser before committing**
- Verify features are WORKING, not just built
- Sacrifice grammar for conciseness in responses and documentation
- Update `docs/development-progress.yaml` when moving to next phase
- Commit only after tests pass

**Never:**
- Mark feature as complete without automated testing
- Create GitHub repos without explicit user confirmation
- Store secrets/keys in files not in `.gitignore`
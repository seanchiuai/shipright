# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Shipright helps non-technical founders turn app ideas into GitHub repos. Users complete an AI-guided interview, get matched to a curated template, and receive a repo with AI-optimized scaffolding files.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Convex (database, serverless functions, auth with Google OAuth)
- Claude API (interview question generation)
- GitHub API (repo creation via OAuth)
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

## Planning Docs

- `docs/STRUCTURE.md` - Repository organization and directory layout
- `docs/PRD.md` - Current MVP PRD
- `docs/tech-stack.md` - Detailed tech choices
- `docs/design.md` - UI specs
- `TASKS.md` - Task backlog
- `docs/development-progress.yaml` - Current phase tracking (source of truth for which phase is active)


## Boundaries

**Always:**
- Only work on the current phase
- Verify features are WORKING, not just built
- Sacrifise grammar for the sake of conciseness in your responses and documentation
- Update `docs/development-progress.yaml` when moving to next phase (use `./.claude/update-phase.sh`)
- Commit changes after every change (even the smallest bug fixes).

**Never:**
- Mark feature as complete without automated user testing
- Create GitHub repos without explicit user confirmation
- Store secrets and keys in files not in `.gitignore`

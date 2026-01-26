# Phase 1: UI + Authentication

Build the foundation: landing page, Google OAuth, and dashboard shell.

## User Stories

Complete these from `docs/PRD.md`:
- **US-001**: Google OAuth Authentication
- **US-002**: Landing Page
- **US-013**: User Dashboard

## Read First

1. `docs/PRD.md` → Find US-001, US-002, US-013 acceptance criteria
2. `.claude/skills/convex-patterns/` → Auth setup, schema design
3. `.claude/skills/ui-components/` → shadcn/ui patterns
4. `docs/design.md` → Landing page, dashboard layouts

## Tasks

1. Initialize Next.js 14 + TypeScript + Tailwind project
2. Set up Convex with schema for users and projects
3. Configure Convex Auth with Google OAuth
4. Build landing page (hero, value prop, sign-in button)
5. Build protected dashboard route (project list, new project button)
6. Implement logout functionality
7. Test full auth flow with agent-browser

## Per Iteration

- Build one feature
- Test with agent-browser
- Commit if tests pass
- Continue to next feature

## Completion

When ALL acceptance criteria for US-001, US-002, US-013 are met and tested, output:

<promise>PHASE 1 COMPLETE</promise>

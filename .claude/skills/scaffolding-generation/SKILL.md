---
name: scaffolding-generation
description: How cc-template files are injected and customized via Claude Code in a Daytona sandbox
---

# Scaffolding Generation

Injects the cc-template development methodology into user repos and uses Claude Code to fill all {{PLACEHOLDER}} values with project-specific content.

## Where It Fits

**Phase 5**: After GitHub repo created (Phase 4). This is the final MVP phase.

## Pipeline Overview

Phase 5 has 7 steps:

1. **Generate PRD** (Convex/Gemini) — Convert interview requirements into PRD markdown
2. **Research tech stack** (Convex/Gemini) — Identify integrations beyond base template stack. Ask user if ambiguous.
3. **Spin up Daytona sandbox** — Ephemeral sandbox
4. **Inject cc-template** — Clone cc-template repo, copy files into user's repo
5. **Run Claude Code** — Fill {{PLACEHOLDER}} templates one by one in dependency order
6. **Commit + push** — All scaffolding committed to user's GitHub repo
7. **Destroy sandbox** — Cleanup

## cc-template Source

Repo: `https://github.com/seanchiuai/cc-template.git`

**Copied as-is** (no customization):
- `.claude/settings.json`, `.claude/hooks/`, `.claude/commands/`
- `.claude/skills/create-skill/`

**Customized by Claude Code** ({{PLACEHOLDER}} syntax):
- `template-CLAUDE.md` → becomes `CLAUDE.md`
- `TASKS.md`
- `docs/PRD.md`
- `docs/design.md`
- `docs/development-progress.yaml`
- `prompts/phase-1.md` (copied per phase)

## File Fill Order (Dependency Chain)

Claude Code fills templates one by one:

```
Interview Requirements + PRD + Tech Stack Research
       ↓
   1. docs/PRD.md (source of truth — user stories, acceptance criteria)
       ↓
   2. docs/design.md (UI specs from PRD features)
       ↓
   3. template-CLAUDE.md → CLAUDE.md (phases, stack, skills list)
       ↓
   4. TASKS.md (tasks reference PRD user stories)
       ↓
   5. docs/development-progress.yaml (phase definitions from CLAUDE.md)
       ↓
   6. prompts/phase-N.md (one per phase)
       ↓
   7. .claude/skills/ (domain-specific: payments, auth, integrations)
```

## What Gets Generated

| File | Purpose | Source |
|------|---------|--------|
| `CLAUDE.md` | AI agent system prompt | template-CLAUDE.md + project details |
| `TASKS.md` | Feature backlog by phase | Requirements + PRD user stories |
| `docs/PRD.md` | Product requirements | Interview requirements (Step 1 PRD) |
| `docs/design.md` | UI wireframes, components | PRD features + user flows |
| `docs/development-progress.yaml` | Phase tracker | CLAUDE.md phase structure |
| `prompts/phase-N.md` | Ralph Loop prompts | One per phase |
| `.claude/skills/` | Domain-specific knowledge | Detected integration needs |

## Step 1: PRD Generation (Pre-sandbox)

Runs as Convex action using Gemini. Converts structured requirements into formal PRD with:
- User stories (US-001 format with acceptance criteria checkboxes)
- Functional requirements by domain
- Data model (TypeScript interfaces)
- User flows
- Non-goals

## Step 2: Tech Stack Research (Pre-sandbox)

Runs as Convex action using Gemini. Template matching (Phase 3) only decides the base stack. This step:
- Identifies integration needs from requirements + gaps
- Recommends best library for each (e.g., Stripe for payments, Resend for email)
- If confident: adds to `resolved` array
- If torn between options: adds to `choices` array → UI asks user to pick

Output:
```typescript
{
  resolved: [{ need: "Payments", library: "stripe", package: "@stripe/stripe-js", reason: "..." }],
  choices: [{ need: "Email", options: [{ library: "Resend", ... }, { library: "SendGrid", ... }] }]
}
```

## Reference Files

- [reference.md](reference.md) - Generation templates, examples, Convex action patterns, configuration constants
- `convex/lib/git_operations.ts` — Tested Git operations (file fetching, blob creation, commit)
- `convex/lib/credentials.ts` — Sandbox credential provisioning

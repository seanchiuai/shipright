---
name: daytona-sandbox
description: Daytona SDK for sandboxed environments where Claude Code fills cc-template scaffolding files
---

# Daytona Sandbox

Used in Phase 5 to inject cc-template files and run Claude Code to fill {{PLACEHOLDER}} values with project-specific content.

## When to Use

- Phase 5: After GitHub repo created from template and PRD/tech stack research complete
- Daytona always runs in Phase 5 — it is not conditional on match score

## Where It Fits

**Phase 5 (Steps 3-7)**: After PRD generation and tech stack research (Steps 1-2), the sandbox handles file injection and Claude Code execution.

## The Flow

1. GitHub repo already created (Phase 4) with template code
2. PRD markdown and tech stack research already generated (Phase 5, Steps 1-2)
3. Spin up Daytona sandbox (ephemeral, TypeScript runtime)
4. Clone user's repo into sandbox
5. Clone `github.com/seanchiuai/cc-template` into sandbox
6. Copy cc-template files into user's repo:
   - `.claude/` directory (settings, hooks, commands, skills) → copied as-is
   - Template files with `{{PLACEHOLDER}}` syntax → copied for customization
7. Run Claude Code with assembled prompt (PRD + tech stack + meta-instructions)
8. Claude Code fills templates ONE BY ONE in dependency order:
   1. `docs/PRD.md` (source of truth)
   2. `docs/design.md` (UI specs from PRD)
   3. `template-CLAUDE.md` → rename to `CLAUDE.md`
   4. `TASKS.md` (tasks reference PRD user stories)
   5. `docs/development-progress.yaml` (phases from CLAUDE.md)
   6. `prompts/phase-N.md` (one per phase)
   7. `.claude/skills/` (domain-specific skills)
9. Commit + push all files to GitHub
10. Destroy sandbox

## cc-template Repository

Source: `https://github.com/seanchiuai/cc-template.git`

Contains:
- `.claude/settings.json` — hooks config (phase context on session start)
- `.claude/hooks/` — shell scripts for session/prompt hooks
- `.claude/commands/` — slash commands (orchestrator, refactor, cleanup, etc.)
- `.claude/skills/create-skill/` — guide for creating new skills
- `template-CLAUDE.md` — project CLAUDE.md with {{PLACEHOLDER}} syntax
- `TASKS.md` — task backlog template
- `docs/PRD.md` — PRD template
- `docs/design.md` — design doc template
- `docs/development-progress.yaml` — phase tracker template
- `prompts/phase-1.md` — Ralph Loop prompt template
- Top-level `CLAUDE.md` — meta-instructions for how to fill templates

## Prompt Construction

The Claude Code prompt is assembled from:
1. cc-template's top-level `CLAUDE.md` (meta-instructions)
2. Generated PRD markdown (from Step 1)
3. Tech stack research results JSON (from Step 2)
4. Raw requirements object
5. Template info (name, stack, gaps)
6. File manifest with fill order

Prompt is written to a file in the sandbox to avoid shell escaping issues.

## Cost Considerations

- Sandboxes cost money per minute of runtime
- Set `autoStopInterval` to prevent runaway costs
- Destroy sandbox immediately after use
- Use `ephemeral: true` for auto-cleanup

## Reference Files

- [reference.md](reference.md) - Daytona SDK usage, code examples

## External Documentation

- [Daytona SDK](https://github.com/daytonaio/daytona)
- Use Context7 MCP to fetch current Daytona docs

# Creating a Ralph Loop for Full E2E Pipeline Testing

## Context

Needed a Ralph loop that tests the entire Shipright pipeline end-to-end and doesn't stop until a project is successfully created with a fully populated GitHub repo (no placeholder text remaining).

## Process

### 1. Discovered existing patterns

Searched the repo for existing Ralph loop prompts. Found none initially (`prompts/` only had app-level system prompts), then discovered phase prompts live in `docs/tmp/phase-N.md`.

### 2. Studied the phase prompt format

Read `phase-1.md` through `phase-5.md`. They all follow a minimal structure:

```markdown
# Phase N: Name

Build US-XXX from `docs/PRD.md`.

Check git log and files... Build... Test with agent-browser... Commit if tests pass.

Skills: `skill-a`, `skill-b`
Design: `docs/design.md`

When ALL acceptance criteria are met and tested:
<promise>PHASE N COMPLETE</promise>
```

Key elements: title, user story refs, iteration loop (build/test/commit), skill refs, `<promise>` tag.

### 3. Studied how Ralph loops are invoked

Found the invocation pattern in `docs/HUMAN_NOTES.md`:

```bash
/ralph-wiggum:ralph-loop "$(cat docs/tmp/phase-5.md)" --completion-promise "PHASE 5 COMPLETE" --max-iterations 50
```

The `--completion-promise` string must match the text inside `<promise>` tags.

### 4. Read the PRD and pipeline docs

Read `docs/PRD.md` for all acceptance criteria (US-001 through US-015) and the scaffolding-generation skill to understand the full pipeline steps:

- Landing → Auth → Interview → Summary → Template Matching → GitHub Repo → PRD Generation → Tech Stack Research → (optional) Tech Choices → Daytona Sandbox → cc-template Injection → Claude Code Fills Placeholders → Commit & Push → Cleanup

### 5. Designed the e2e prompt differently from phase prompts

Phase prompts are short because they point at PRD acceptance criteria and trust the loop to figure out implementation. The e2e test prompt needed to be **longer and more explicit** because:

- It's testing, not building — needs exact verification steps
- Covers the entire app, not one phase
- Must specify what "success" looks like at each stage
- Must define failure recovery (capture errors, fix, restart)

### 6. Wrote `docs/tmp/e2e-full-pipeline.md`

Structure:

1. **Setup** — dev servers, skills to load, agent-browser
2. **Test flow** — 6 sequential steps covering the full pipeline
3. **On failure** — error capture, screenshots, Convex logs, fix, restart from beginning
4. **Success criteria** — explicit checklist (all must pass)
5. **Promise tag** — `<promise>FULL PIPELINE TEST PASSED</promise>`

Used a realistic test app idea ("recipe sharing platform") to exercise interview extraction, template matching, and scaffolding.

## Key Decisions

- **Detailed steps vs minimal** — Phase prompts are minimal (Claude figures it out). E2e test prompt is detailed because verification requires specific checks (file exists, no placeholders, dashboard state).
- **Restart on failure** — The prompt says to fix the bug and restart from the beginning, not resume mid-flow. This ensures we test the full path works, not just individual patches.
- **Repo content verification** — Explicitly lists every file that must exist and must not contain `{{PLACEHOLDER}}` text. This is the core success signal.
- **High max-iterations** — Recommend 50 iterations since the loop may need to fix multiple bugs across the full pipeline before achieving a clean run.

## Invocation

```bash
/ralph-wiggum:ralph-loop "$(cat docs/tmp/e2e-full-pipeline.md)" --completion-promise "FULL PIPELINE TEST PASSED" --max-iterations 50
```

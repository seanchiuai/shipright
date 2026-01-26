# Shipright Phase Tracking System

This hook system ensures Claude Code stays focused on the current development phase and doesn't jump ahead.

## How It Works

1. **Hook**: `.claude/hooks.json` runs on every user prompt submission
2. **State File**: `docs/development-progress.yaml` tracks the active phase and development history
3. **Helper Script**: `.claude/update-phase.sh` updates the current phase

## Usage

### View Current Phase
```bash
./.claude/update-phase.sh
```

### Change Phase
```bash
./.claude/update-phase.sh <phase-number>
```

Example:
```bash
./.claude/update-phase.sh 2  # Move to Interview Flow phase
```

### Available Phases

1. **UI + Authentication** - Landing page, Google OAuth, dashboard shell
2. **Interview Flow** - AI-guided questions, interactive experience
3. **Template Matching** - Requirements extraction, scoring algorithm
4. **GitHub Repo Creation** - OAuth connection, repo from template
5. **Template Customization** - Daytona sandbox + Claude Code execution
6. **Scaffolding Generation** - Generate CLAUDE.md, TASKS.md, PRD.md, skills
7. **Production Deployment** - Deploy to Vercel, configure environment

## What Happens

Every time you send a message to Claude Code, the hook will display:
- Current phase number and name
- Phase description
- Started date
- Completion criteria
- A reminder to complete the phase before moving forward

## Manual Phase File Edit

You can also edit `docs/development-progress.yaml` directly if needed. The file contains:
- **current_phase**: The active phase with completion criteria
- **completed_phases**: History of finished phases (for future use)
- **phases**: Reference catalog of all available phases

Example structure:
```yaml
current_phase:
  phase: 1
  name: "UI + Authentication"
  description: "Landing page, Google OAuth, dashboard shell"
  started: "2026-01-25"
  status: "in-progress"
  completion_criteria:
    - "Landing page is live and styled"
    - "Google OAuth login works"
    - "Dashboard shell renders after login"
    - "User can log out"
```

## Phase Completion Workflow

1. Work on current phase until all completion criteria are met
2. Get user verification that phase is complete
3. Run `./.claude/update-phase.sh <next-phase-number>` to advance
4. Start new Claude Code session (or hook will update on next message)

## Development Progress File Location

The development progress is tracked in `docs/development-progress.yaml` at the repository root. This makes it:
- Version controlled
- Visible to all developers
- Easy to reference in documentation
- Separate from Claude Code internals

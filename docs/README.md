# Shipright Documentation

This directory contains documentation and tracking files for Shipright development.

## Files

### `development-progress.yaml`
**Source of truth for current development phase.**

This file tracks:
- Which phase is currently active
- When the phase started
- Completion criteria for the current phase
- History of completed phases
- Reference catalog of all phases

The file is automatically read by Claude Code hooks to remind agents which phase they're working on.

**Do not manually advance phases without completing and verifying the current phase.**

To update the phase:
```bash
./.claude/update-phase.sh <phase-number>
```

## Development Phases

1. **UI + Authentication** - Landing page, Google OAuth, dashboard shell
2. **Interview Flow** - AI-guided questions, interactive experience
3. **Template Matching** - Requirements extraction, scoring algorithm
4. **GitHub Repo Creation** - OAuth connection, repo from template
5. **Template Customization** - Daytona sandbox + Claude Code execution
6. **Scaffolding Generation** - Generate CLAUDE.md, TASKS.md, PRD.md, skills
7. **Production Deployment** - Deploy to Vercel, configure environment

## Phase Advancement Rules

1. Build all features for current phase
2. **Test that features actually work** (not just compile)
3. Get user confirmation
4. Run `./.claude/update-phase.sh <next-phase>`
5. Begin next phase

See `.claude/PHASE-TRACKING.md` for detailed information about the phase tracking system.

---
name: scaffolding-generation
description: How to generate CLAUDE.md, TASKS.md, PRD.md, and skills for user projects
---

# Scaffolding Generation

Generates AI-optimized files for user projects after template is complete.

## Where It Fits

**Phase 6**: After repo created and optionally customized, before deployment.

## What Gets Generated

| File | Purpose | Always Loaded? |
|------|---------|----------------|
| `CLAUDE.md` | High-level architecture, commands, stable info | Yes |
| `TASKS.md` | Feature backlog | Yes |
| `PRD.md` | Product requirements (reference) | No |
| `.claude/skills/` | Domain-specific knowledge | On-demand |

## Input Sources

- **Interview requirements** - User's answers, extracted requirements
- **Template info** - Stack, capabilities, patterns
- **Build summary** (if customized) - What Daytona actually built

## Generation Guidelines

**CLAUDE.md**:
- Under 100 lines
- Stable info only (won't change frequently)
- Vague project structure (no specific file paths)
- Sections: Overview, Tech Stack, Commands, Boundaries

**TASKS.md**:
- Current Sprint (first 3-5 priority features)
- Backlog (remaining features)
- Completed (empty initially)

**Skills**:
- Always include `create-skill` guide
- Generate domain-specific skills based on interview
- Avoid predefined categories - match project's actual domains

## Reference Files

- [reference.md](reference.md) - Generation templates, examples

## External Documentation

- No external docs needed (generated from user's project)

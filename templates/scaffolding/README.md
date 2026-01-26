# Scaffolding Templates

Templates for generating AI-optimized project scaffolding files. These files help Claude Code (and other AI coding assistants) understand and work effectively with the codebase.

## Files

| File | Purpose | When Updated |
|------|---------|--------------|
| `CLAUDE.md` | Project overview, commands, patterns, boundaries | Rarely (stable info only) |
| `TASKS.md` | Task backlog with sprint/backlog/completed sections | Frequently (as work progresses) |
| `PRD.md` | Product requirements document | Initially (kickstart doc) |

## Skills Directory

`.claude/skills/` contains domain-specific knowledge that loads on-demand.

Included:
- `create-skill/` - Guide for creating new skills

Skills are created based on the project's actual needs, not predefined categories. See `create-skill/SKILL.md` for how to add new skills.

## Usage

### Generating Scaffolding

1. Copy the templates to the target project
2. Replace all `{{PLACEHOLDER}}` values with project-specific content
3. Delete any sections that don't apply
4. Add project-specific skills as needed

### Placeholder Format

All placeholders use `{{PLACEHOLDER_NAME}}` format:
- `{{PROJECT_NAME}}` - Name of the project
- `{{TECH_STACK}}` - Technologies used
- `{{COMMANDS}}` - CLI commands for the project
- etc.

### Guidelines

**CLAUDE.md:**
- Keep under 100 lines
- Only include stable information that won't change
- Project structure should be high-level (not specific file paths)
- Reference skills for detailed domain knowledge

**TASKS.md:**
- Update frequently as work progresses
- Move tasks between sections (Current Sprint → Completed)
- Include acceptance criteria for clarity

**PRD.md:**
- Primarily a kickstart document
- Used for initial planning and context
- Can be updated as requirements evolve

**Skills:**
- One skill per domain/workflow
- Load on-demand (progressive disclosure)
- Include code examples and step-by-step instructions
- Keep focused on actionable guidance

## Adding New Skills

See `.claude/skills/create-skill/SKILL.md` for the full guide. Quick steps:

1. Create directory: `.claude/skills/<skill-name>/`
2. Add `SKILL.md` with YAML frontmatter and content
3. Reference in `CLAUDE.md` skills list

## Best Practices

1. **Be specific** - Vague instructions lead to inconsistent results
2. **Include examples** - Code snippets and patterns help AI understand expectations
3. **Document boundaries** - What to always do, what to never do
4. **Keep it current** - Outdated docs cause confusion
5. **Progressive disclosure** - Put details in skills, not CLAUDE.md

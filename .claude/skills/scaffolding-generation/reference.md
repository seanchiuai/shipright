# Scaffolding Generation Reference

Templates and examples for generating AI-optimized files.

## CLAUDE.md Template

```markdown
# {appName}

{problemStatement}

## Tech Stack

{stack}

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Development server
npm run build            # Production build
npm run lint             # Linting
```

## Development

{devInstructions}

## Boundaries

**Always:**
- Follow existing code patterns
- Write tests for new features

**Never:**
- Commit secrets or API keys
- Skip type checking
```

**Guidelines:**
- Under 100 lines
- Stable info only (won't need frequent updates)
- No specific file paths (they change)
- Sections: Overview, Tech Stack, Commands, Boundaries

## TASKS.md Template

```markdown
# Tasks

## Current Sprint

- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Feature 3: Description

## Backlog

- [ ] Feature 4: Description
- [ ] Feature 5: Description

## Completed

_Tasks appear here as completed_
```

**Guidelines:**
- Current Sprint: First 3-5 "must have" features from requirements
- Backlog: Remaining features
- Features written as actionable task descriptions

## PRD.md Template

```markdown
# Product Requirements Document

## Problem

{problemStatement}

## Users

### {userType1}
{description}

### {userType2}
{description}

## Core Features

### {feature1}
{description}

### {feature2}
{description}

## Data Model

{entities and relationships}

## User Flows

{key user journeys}

## Integrations

- Integration 1
- Integration 2
```

**Guidelines:**
- Plain language (user should understand it)
- Derived entirely from interview (no hallucination)
- Used for initial planning, not frequently during dev

## create-skill Template

Always include this skill in every generated project:

```markdown
---
name: create-skill
description: Guide for creating new skills
---

# Creating New Skills

Skills are domain-specific knowledge files Claude can access on-demand.

## When to Create

- Implementing a new integration (Stripe, SendGrid)
- Adding a complex feature (real-time chat, video)
- Working with a new library

## Structure

```
.claude/skills/{skill-name}/
├── SKILL.md           # Overview (under 150 lines)
└── reference.md       # Detailed examples (optional)
```

## SKILL.md Format

```markdown
---
name: skill-name
description: Brief description
---

# Skill Name

Overview of what this covers.

## When to Use

- Use case 1
- Use case 2

## Quick Reference

[Core patterns]

## Reference Files

- [reference.md](reference.md) - Details

## External Docs

- [Library Docs](https://example.com)
```
```

## Domain-Specific Skills

Generate additional skills based on detected domains:

**If payments needed:**
```markdown
---
name: payments
description: Stripe integration patterns
---

# Payments

Stripe integration for {paymentModel}.

## Setup

[Stripe setup steps]

## Reference Files

- [reference.md](reference.md) - Webhooks, checkout

## External Docs

- [Stripe Docs](https://stripe.com/docs)
```

**If specific integrations detected:**
Generate a skill for each (e.g., `sendgrid`, `twilio`, `openai`).

## Generation Process

1. Gather inputs: requirements, template info, build summary (if any)
2. Generate CLAUDE.md from template + user info
3. Generate TASKS.md from features in requirements
4. Generate PRD.md structured from interview answers
5. Generate skills based on detected domains
6. Commit all files in single commit to GitHub

## Convex Action Pattern

```typescript
// convex/scaffolding.ts
export const generateScaffolding = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });

    const files = [
      { path: "CLAUDE.md", content: generateClaudeMd(project) },
      { path: "TASKS.md", content: generateTasksMd(project) },
      { path: "PRD.md", content: generatePrdMd(project) },
      { path: ".claude/skills/create-skill/SKILL.md", content: createSkillGuide() },
    ];

    // Add domain-specific skills
    if (project.requirements.payments.needed) {
      files.push({ path: ".claude/skills/payments/SKILL.md", content: generatePaymentsSkill() });
    }

    await ctx.runAction(api.github.commitScaffolding, {
      repoFullName: project.repoFullName,
      files,
      userId: project.userId,
    });

    return { success: true };
  },
});
```

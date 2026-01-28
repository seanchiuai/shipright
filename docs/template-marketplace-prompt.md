# Template Marketplace Planning Prompt

> Use this prompt to continue planning the template marketplace system.

---

## Context

You are planning the next evolution of Shipright's template matching system.

**Current state:**
- 10 curated templates with fixed categories (auth, db, payments, features, ui)
- AI determines category weights, then deterministic scoring picks best match
- Works for MVP but won't scale

**Target state:**
- 100+ templates including specialized ones (OpenAI Voice, Google Maps, etc.)
- Tag-based filtering + AI ranking (two-stage matching)
- Marketplace with official and community templates

Read the full plan: `docs/template-marketplace-plan.md`

---

## Your Task

Continue planning by addressing these areas:

### 1. Tag Taxonomy Design

Create `data/tags-taxonomy.json` with:
- Hierarchical tag structure (e.g., `ai` → `ai:openai` → `ai:openai:realtime`)
- Coverage for: AI/ML, Maps, Payments, Auth, Database, Realtime, Video, Email, Storage
- Rules for tag naming conventions

### 2. Template Schema Migration

Design migration from current schema to v2:
- What fields are added?
- How to handle existing templates?
- Backwards compatibility strategy

### 3. Matching Algorithm v2

Flesh out the two-stage matching:
- Stage 1: Tag extraction prompt (what makes a good prompt?)
- Stage 1: Tag overlap scoring (exact match vs. partial match vs. hierarchy match)
- Stage 2: AI ranking prompt (how to present candidates efficiently?)
- Fallback behavior when no good matches

### 4. UI/UX for Marketplace

Sketch the user flows:
- Browsing templates by category
- Searching templates
- Template detail page
- "Why this template?" explanation

### 5. Template Submission Pipeline

For community templates:
- Submission format (GitHub URL + metadata)
- Automated validation (repo exists, builds, no secrets)
- Manual review checklist
- Ongoing maintenance (what if repo goes stale?)

---

## Constraints

- Must be backwards compatible with current 10 templates
- Must work with Convex as database
- AI calls should be minimized (cost)
- First stage (tag filter) must be fast (<100ms)

---

## Deliverables

1. `data/tags-taxonomy.json` - Complete tag hierarchy
2. Updated `data/templates.json` - Add tags to existing templates
3. `docs/template-marketplace-spec.md` - Technical specification
4. `docs/template-submission-guide.md` - For community contributors

---

## Files to Reference

- `docs/template-marketplace-plan.md` - High-level vision
- `convex/matching.ts` - Current matching implementation
- `convex/templates.ts` - Current template storage
- `data/templates.json` - Current template data
- `.claude/skills/template-matching/` - Skill documentation

---

## Questions to Answer

1. How specific should tags be? (`ai:openai:gpt4-turbo` vs just `ai:openai`)
2. Should templates have required vs optional tags?
3. How to handle templates that span multiple categories? (e.g., "AI + Maps")
4. What's the minimum tag overlap to consider a template a candidate?
5. How to weight recency, popularity, and match quality in ranking?

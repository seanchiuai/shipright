---
name: template-matching
description: Template scoring algorithm, template index, and matching logic
---

# Template Matching

Matches user requirements to the best-fit templates from a curated library using two-stage tag-based matching.

## Where It Fits

**Phase 3**: After interview complete, before GitHub repo creation.

## Two-Stage Matching Algorithm

**V2 (Current):** Tag-based matching with AI ranking

1. **Tag Extraction (AI):** Extract relevant tags from requirements (e.g., `auth:clerk`, `database:convex`, `type:saas`)
2. **Tag Filtering (Deterministic):** Filter templates by tag overlap score (≥30% or 1+ exact match)
3. **AI Ranking:** Rank top candidates and return top 5 with explanations

**Score Formula:** 40% tag score + 60% AI ranking score

**V1 (Legacy):** 5-category weighted scoring preserved for backwards compatibility.

## Confidence Thresholds

- **>70%** - Strong match, proceed confidently
- **50-70%** - Decent match, proceed to Phase 5 (Daytona customization)
- **<50%** - Poor match, fallback to minimal-starter template

## Tag Taxonomy

Hierarchical tags with parent/child relationships:
- `ai` → `ai:openai`, `ai:anthropic`, `ai:streaming`
- `payments` → `payments:stripe`, `payments:stripe:subscriptions`
- `auth` → `auth:clerk`, `auth:nextauth`, `auth:roles`, `auth:orgs`
- `database` → `database:convex`, `database:prisma`, `database:drizzle`
- `realtime` → `realtime:convex`, `realtime:websocket`
- `ui` → `ui:shadcn`, `ui:tailwind`, `ui:dashboard`
- `type:saas`, `type:ecommerce`, `type:internal`, `type:b2b`

See `data/tags-taxonomy.json` for complete list.

## Template Library (10 templates)

See [reference.md](reference.md) for complete template index with tags.

## Match Result (V2)

Returns:
- `topMatches[]` - Top 5 ranked templates with scores, pros, cons
- `bestMatch` - Highest scoring template
- `extractedTags[]` - Tags derived from requirements

Each match includes:
- Slug, name, score (0-100)
- Tag score (40%) + AI score (60%)
- Reasoning, pros, cons
- Full template object

## Reference Files

- [reference.md](reference.md) - Template schema, scoring code, template index
- `convex/matching.ts` - matchTemplate (V1), matchTemplateV2 (current)
- `data/tags-taxonomy.json` - Hierarchical tag definitions
- `data/templates.json` - Template catalog with tags

---
name: template-matching
description: Template scoring algorithm, template index, and matching logic
---

# Template Matching

Matches user requirements to the best-fit template from a curated library using weighted capability scoring.

## Where It Fits

**Phase 3**: After interview complete, before GitHub repo creation.

## Matching Algorithm

5-category weighted scoring with AI-determined weights:

1. **Weight Determination (AI):** Gemini analyzes requirements and assigns weights to each category (auth, database, payments, features, ui) — weights sum to 1.0
2. **Category Scoring (Deterministic):** Each template scored 0-100 per category based on capability match
3. **Weighted Total:** `score = auth*w_auth + db*w_db + pay*w_pay + feat*w_feat + ui*w_ui`

**Score Formula:** Weighted sum of 5 category scores (0-100 each)

## Confidence Thresholds

- **>70%** - Strong match, proceed confidently
- **50-70%** - Decent match, proceed to Phase 5 (Daytona customization)
- **<50%** - Poor match, fallback to minimal-starter template

## Category Scoring

- **Auth**: 90 if present, 40 if not
- **Database**: 90 if present, 20 if not
- **Payments**: 100 for exact match (both need or both don't), 0 if needed but missing
- **Features**: Keyword matching against keyFeatures (file uploads, email, search, AI)
- **UI**: Bonus for shadcn (+30), tailwind (+15), landing page (+10)

## Gap Detection

Identifies what the template is missing vs requirements:
- Payment processing, file uploads, email, search, AI/chat
- Real-time sync, user roles, organizations

## Template Library (10 templates)

See [reference.md](reference.md) for complete template index.

## Match Result

Returns:
- `template` - Best matching template object
- `score` - Weighted total (0-100)
- `scoreBreakdown` - Per-category scores
- `weights` - AI-determined category weights
- `gaps` - Features needed but not in template
- `included` - Features already in template

## Key Files

- `convex/matching.ts` - `matchTemplate` action
- `convex/templates.ts` - Template CRUD + sync
- `convex/lib/vertex.ts` - Shared Vertex AI provider (used for weight determination)

## Reference Files

- [reference.md](reference.md) - Template schema, scoring code, template index
- `data/templates.json` - Template catalog with tags

---
name: template-matching
description: Template scoring algorithm, template index, and matching logic
---

# Template Matching

Matches user requirements to the best-fit template from a curated library.

## Where It Fits

**Phase 3**: After interview complete, before GitHub repo creation.

## Scoring Algorithm

1. Parse structured requirements from interview
2. For each template in index:
   - Score each category (auth, database, payments, features, UI)
   - Apply category weights
   - Calculate weighted total
3. Return top match with confidence score

## Confidence Thresholds

- **>70%** - Strong match, proceed confidently
- **50-70%** - Decent match, proceed to Phase 5 (Daytona customization)
- **<50%** - Poor match, use minimal starter template

## Scoring Weights

Weights are **AI-determined** based on app context. The AI analyzes the requirements and assigns weights that sum to 1.0.

| Category | Default | What it measures |
|----------|---------|------------------|
| Auth | 25% | Authentication methods, roles, orgs |
| Database | 25% | DB type, realtime support |
| Payments | 20% | Payment provider, billing models |
| Features | 20% | File uploads, email, search, AI |
| UI | 10% | Component library, admin dashboard |

Example weight distributions:
- E-commerce: payments=35%, database=25%, auth=20%
- Social network: database=30%, auth=30%, features=25%
- AI chatbot: features=40%, database=25%, auth=20%

## Template Library (MVP: 10 templates)

See [reference.md](reference.md) for complete template index.

## Match Result

Present to user:
- Matched template name and description
- "What's included" checklist
- "What will be built" list (gaps to fill)
- Confidence score with explanation

## Reference Files

- [reference.md](reference.md) - Template schema, scoring code, template index

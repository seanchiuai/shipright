# Template Matching Reference

Complete template schema, two-stage matching algorithm, and template index.

## Template Schema

```typescript
interface Template {
  slug: string;
  name: string;
  description: string;
  sourceUrl: string;
  stack: string[];
  capabilities: {
    auth: { present: boolean; providers: string[]; hasRoles: boolean; hasOrgs: boolean };
    database: { present: boolean; type: string; realtime: boolean };
    payments: { present: boolean; provider?: string; models?: string[] };
    ui: { framework: string; hasAdminDashboard: boolean; hasLandingPage: boolean };
    features: { fileUploads: boolean; email: boolean; search: boolean; ai: boolean };
  };
  tags: string[];
  integrations: string[];
  useCases: string[];
  complexity: "starter" | "intermediate" | "advanced";
  maintained: boolean;
  lastVerified: string;
}
```

## V2 Two-Stage Matching Algorithm

See `convex/matching.ts` for full implementation.

### Stage 1: Tag Extraction

```typescript
async function extractTagsFromRequirements(requirements: Requirements): Promise<string[]> {
  const { object } = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: tagExtractionSchema,
    prompt: `Analyze requirements and select relevant tags from: ${availableTags.join(", ")}`,
  });
  return object.tags.filter((tag) => availableTags.includes(tag));
}
```

### Stage 2: Tag Filtering

```typescript
function calculateTagOverlap(userTags: string[], templateTags: string[]): number {
  let totalScore = 0;
  for (const userTag of userTags) {
    if (templateTags.includes(userTag)) {
      totalScore += 1.0; // Exact match
    } else if (tmplTag.startsWith(userTag + ":")) {
      totalScore += 0.7; // User tag is parent
    } else if (userTag.startsWith(tmplTag + ":")) {
      totalScore += 0.5; // Template tag is parent
    } else if (sameParent) {
      totalScore += 0.3; // Same category
    }
  }
  return totalScore / userTags.length;
}

function filterTemplatesByTags(templates, userTags) {
  return templates
    .filter(t => tagScore >= 0.3 || hasExactMatch)
    .sort((a, b) => b.tagScore - a.tagScore)
    .slice(0, 20);
}
```

### Stage 3: AI Ranking

```typescript
async function rankCandidates(candidates, requirements): Promise<RankedTemplate[]> {
  const { object } = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: rankingSchema,
    prompt: `Rank these templates for the requirements. Return top 5 with score, reasoning, pros, cons.`,
  });

  return object.rankings.map(ranking => ({
    score: Math.round(candidate.tagScore * 40 + ranking.score * 0.6), // 40% tag + 60% AI
    tagScore, aiScore, reasoning, pros, cons, template,
  }));
}
```

### matchTemplateV2 Action

```typescript
export const matchTemplateV2 = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<MatchResultV2> => {
    const extractedTags = await extractTagsFromRequirements(requirements);
    let candidates = filterTemplatesByTags(templates, extractedTags);
    if (candidates.length === 0) {
      candidates = templates.map(t => ({ template: t, tagScore: 0 }));
    }
    const rankedMatches = await rankCandidates(candidates, requirements);

    await ctx.runMutation(api.projects.setMatchedTemplate, {
      projectId, templateId: bestMatch.template._id, templateName: bestMatch.template.name, matchScore, matchGaps,
    });

    return { topMatches: rankedMatches, bestMatch: rankedMatches[0], extractedTags };
  },
});
```

## V1 Legacy Scoring (Backwards Compatible)

```typescript
// AI determines weights dynamically based on app context
const weights = await determineWeights(requirements);

const scores = {
  auth: scoreAuth(requirements.auth, template.capabilities.auth),
  database: scoreDatabase(requirements.database, template.capabilities.database),
  payments: scorePayments(requirements.payments, template.capabilities.payments),
  features: scoreFeatures(requirements.features, template.capabilities.features),
  ui: scoreUI(requirements, template.capabilities.ui),
};

const totalScore =
  scores.auth * weights.auth +
  scores.database * weights.database +
  scores.payments * weights.payments +
  scores.features * weights.features +
  scores.ui * weights.ui;
```

## Template Index

10 templates with tags. See `data/templates.json` for full details.

| Slug | Tags | Complexity |
|------|------|------------|
| minimal-starter | `type:portfolio`, `ui:tailwind` | starter |
| simple-auth | `auth`, `auth:nextauth`, `ui:tailwind` | starter |
| simple-database | `database`, `database:prisma`, `ui:tailwind` | starter |
| t3-stack | `auth`, `auth:nextauth`, `database`, `database:prisma`, `ui:tailwind` | intermediate |
| saas-boilerplate | `type:saas`, `database:supabase`, `auth:supabase`, `payments:stripe`, `realtime` | intermediate |
| convex-saas-starter | `type:saas`, `database:convex`, `auth:clerk`, `payments:stripe`, `realtime:convex`, `ui:shadcn` | intermediate |
| ai-chatbot | `ai`, `ai:openai`, `ai:streaming`, `auth:nextauth`, `database:postgres`, `ui:shadcn` | intermediate |
| e-commerce | `type:ecommerce`, `payments:stripe`, `ui:tailwind` | intermediate |
| admin-dashboard | `type:internal`, `auth:roles`, `ui:shadcn`, `ui:dashboard` | intermediate |
| multi-tenant-saas | `type:saas`, `type:b2b`, `database:drizzle`, `auth:clerk`, `auth:orgs`, `payments:stripe`, `ui:shadcn` | advanced |

## Tag Taxonomy

See `data/tags-taxonomy.json`:

```json
{
  "allTags": [
    "ai", "ai:openai", "ai:anthropic", "ai:streaming",
    "payments", "payments:stripe", "payments:stripe:subscriptions",
    "auth", "auth:clerk", "auth:nextauth", "auth:roles", "auth:orgs",
    "database", "database:convex", "database:prisma", "database:drizzle",
    "realtime", "realtime:convex", "realtime:websocket",
    "ui", "ui:shadcn", "ui:tailwind", "ui:dashboard",
    "type:saas", "type:ecommerce", "type:internal", "type:b2b"
  ]
}
```

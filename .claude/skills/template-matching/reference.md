# Template Matching Reference

Complete template schema, weighted scoring algorithm, and template index.

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

## Weighted Scoring Algorithm

See `convex/matching.ts` for full implementation.

### Weight Determination (AI)

```typescript
import { getVertexProvider } from "./lib/vertex";

async function determineWeights(requirements: Requirements): Promise<Weights> {
  const vertex = getVertexProvider();

  const { object } = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: weightsSchema,
    prompt: `Analyze this app and assign weights (sum to 1.0) for: auth, database, payments, features, ui`,
  });

  // Normalize if sum != 1.0
  const sum = object.auth + object.database + object.payments + object.features + object.ui;
  if (Math.abs(sum - 1.0) > 0.01) {
    return { auth: object.auth / sum, database: object.database / sum, ... };
  }
  return object;
}
```

### Category Scoring Functions

```typescript
function scoreAuth(_requirements, tmplAuth): number {
  if (tmplAuth.present) return 90;
  return 40;
}

function scoreDatabase(_requirements, tmplDb): number {
  if (!tmplDb.present) return 20;
  return 90;
}

function scorePayments(requirements, tmplPay): number {
  if (!requirements.hasPayments && !tmplPay.present) return 100;
  if (!requirements.hasPayments && tmplPay.present) return 80;
  if (requirements.hasPayments && !tmplPay.present) return 0;
  return 100;
}

function scoreFeatures(requirements, tmplFeatures): number {
  // Keyword matching: upload/file/image → fileUploads, email/notification → email, etc.
  // Returns 50 + (matches/checked) * 50, or 80 if no feature keywords found
}

function scoreUI(_requirements, tmplUI): number {
  let score = 50;
  if (tmplUI.framework === "shadcn") score += 30;
  else if (tmplUI.framework === "tailwind") score += 15;
  if (tmplUI.hasLandingPage) score += 10;
  return Math.min(100, score);
}
```

### matchTemplate Action

```typescript
export const matchTemplate = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<MatchResult> => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    const requirements = project.requirements;
    const templates = await ctx.runQuery(api.templates.list, {});

    // AI determines weights
    const weights = await determineWeights(requirements);

    // Score each template
    for (const template of templates) {
      const scoreBreakdown = {
        auth: scoreAuth(requirements, template.capabilities.auth),
        database: scoreDatabase(requirements, template.capabilities.database),
        payments: scorePayments(requirements, template.capabilities.payments),
        features: scoreFeatures(requirements, template.capabilities.features),
        ui: scoreUI(requirements, template.capabilities.ui),
      };
      const totalScore = Math.round(
        scoreBreakdown.auth * weights.auth +
        scoreBreakdown.database * weights.database +
        scoreBreakdown.payments * weights.payments +
        scoreBreakdown.features * weights.features +
        scoreBreakdown.ui * weights.ui
      );
    }

    // Fallback to "Minimal Starter" if best score < 50
    if (bestMatch.score < 50) {
      bestMatch = templates.find(t => t.name === "Minimal Starter") || bestMatch;
    }

    await ctx.runMutation(api.projects.setMatchedTemplate, {
      projectId, templateId, templateName, matchScore, matchGaps,
    });

    return bestMatch;
  },
});
```

## Gap Detection

```typescript
function identifyGaps(requirements, template): string[] {
  // Checks for missing: payments, file uploads, email, search, AI/chat
  // Also checks constraints.mustHave for: realtime, roles, organizations
  return [...new Set(gaps)];
}

function identifyIncluded(template): string[] {
  // Lists what's included: auth providers, database type, payments, UI features, etc.
  return included;
}
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

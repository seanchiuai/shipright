# Template Matching Reference

Complete template schema, scoring algorithm, and template index.

## Template Schema

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  sourceUrl: string; // GitHub URL to clone
  stack: string[];
  capabilities: {
    auth: {
      present: boolean;
      providers: string[];
      hasRoles: boolean;
      hasOrgs: boolean;
    };
    database: {
      present: boolean;
      type: string;
      realtime: boolean;
    };
    payments: {
      present: boolean;
      provider?: string;
      models?: string[];
    };
    ui: {
      framework: string;
      hasAdminDashboard: boolean;
      hasLandingPage: boolean;
    };
    features: {
      fileUploads: boolean;
      email: boolean;
      search: boolean;
      ai: boolean;
    };
  };
}
```

## Scoring Algorithm

Weights are determined by AI based on app context. See `convex/matching.ts` for implementation.

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

function scoreAuth(reqAuth: any, tmplAuth: any): number {
  if (!reqAuth.needed && !tmplAuth.present) return 100;
  if (!reqAuth.needed && tmplAuth.present) return 80; // Not needed but included
  if (reqAuth.needed && !tmplAuth.present) return 0;

  let score = 100;

  // Check auth providers
  const matchedProviders = reqAuth.methods.filter((m: string) =>
    tmplAuth.providers.includes(m)
  );
  score *= matchedProviders.length / reqAuth.methods.length;

  // Check roles/orgs
  if (reqAuth.hasRoles && !tmplAuth.hasRoles) score *= 0.7;
  if (reqAuth.hasOrgs && !tmplAuth.hasOrgs) score *= 0.7;

  return score;
}

function scoreDatabase(reqDb: any, tmplDb: any): number {
  if (!reqDb.needed && !tmplDb.present) return 100;
  if (!reqDb.needed && tmplDb.present) return 80;
  if (reqDb.needed && !tmplDb.present) return 0;

  let score = 100;
  if (reqDb.realtime && !tmplDb.realtime) score *= 0.5;

  return score;
}

function scorePayments(reqPay: any, tmplPay: any): number {
  if (!reqPay.needed && !tmplPay.present) return 100;
  if (!reqPay.needed && tmplPay.present) return 80;
  if (reqPay.needed && !tmplPay.present) return 0;

  let score = 100;
  if (reqPay.model && tmplPay.models && !tmplPay.models.includes(reqPay.model)) {
    score *= 0.6;
  }

  return score;
}

function scoreFeatures(reqFeatures: any[], tmplFeatures: any): number {
  // Count how many required features are present in template
  const mustFeatures = reqFeatures.filter(f => f.priority === "must");
  if (mustFeatures.length === 0) return 100;

  let matches = 0;
  mustFeatures.forEach(feature => {
    const name = feature.name.toLowerCase();
    if (name.includes("upload") && tmplFeatures.fileUploads) matches++;
    if (name.includes("email") && tmplFeatures.email) matches++;
    if (name.includes("search") && tmplFeatures.search) matches++;
    if (name.includes("ai") && tmplFeatures.ai) matches++;
  });

  return (matches / mustFeatures.length) * 100;
}

function scoreUI(requirements: Requirements, tmplUI: any): number {
  let score = 50; // Base score

  // Prefer templates with shadcn/ui
  if (tmplUI.framework.includes("shadcn")) score += 25;

  // Admin dashboard for apps with admin users
  const hasAdmin = requirements.userTypes.some(u => u.isAdmin);
  if (hasAdmin && tmplUI.hasAdminDashboard) score += 25;
  if (hasAdmin && !tmplUI.hasAdminDashboard) score -= 15;

  return Math.max(0, Math.min(100, score));
}
```

## Template Index (MVP)

```typescript
const templates: Template[] = [
  {
    id: "minimal-starter",
    name: "Minimal Starter",
    description: "create-next-app with TypeScript and Tailwind",
    sourceUrl: "https://github.com/vercel/next.js/tree/canary/examples/with-tailwindcss",
    stack: ["Next.js", "TypeScript", "Tailwind"],
    capabilities: {
      auth: { present: false, providers: [], hasRoles: false, hasOrgs: false },
      database: { present: false, type: "", realtime: false },
      payments: { present: false },
      ui: { framework: "tailwind", hasAdminDashboard: false, hasLandingPage: false },
      features: { fileUploads: false, email: false, search: false, ai: false },
    },
  },
  {
    id: "simple-auth",
    name: "Simple Auth",
    description: "Next.js with NextAuth.js (Google OAuth)",
    sourceUrl: "https://github.com/nextauthjs/next-auth-example",
    stack: ["Next.js", "NextAuth.js", "TypeScript"],
    capabilities: {
      auth: { present: true, providers: ["google", "github"], hasRoles: false, hasOrgs: false },
      database: { present: false, type: "", realtime: false },
      payments: { present: false },
      ui: { framework: "tailwind", hasAdminDashboard: false, hasLandingPage: false },
      features: { fileUploads: false, email: false, search: false, ai: false },
    },
  },
  {
    id: "convex-saas-starter",
    name: "Convex SaaS Starter",
    description: "Real-time SaaS with Convex, Auth, and Payments",
    sourceUrl: "https://github.com/get-convex/convex-saas-starter",
    stack: ["Next.js", "Convex", "shadcn/ui", "Stripe"],
    capabilities: {
      auth: { present: true, providers: ["google", "email"], hasRoles: true, hasOrgs: true },
      database: { present: true, type: "convex", realtime: true },
      payments: { present: true, provider: "stripe", models: ["subscription"] },
      ui: { framework: "shadcn", hasAdminDashboard: true, hasLandingPage: true },
      features: { fileUploads: true, email: true, search: false, ai: false },
    },
  },
  // Add 7 more templates for MVP
];
```

## Finding Best Match

```typescript
function findBestMatch(requirements: Requirements): {
  template: Template;
  score: number;
  gaps: string[];
} {
  let bestMatch = templates[0];
  let bestScore = 0;

  for (const template of templates) {
    const score = scoreTemplate(requirements, template);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  const gaps = identifyGaps(requirements, bestMatch);

  return {
    template: bestMatch,
    score: bestScore,
    gaps,
  };
}

function identifyGaps(requirements: Requirements, template: Template): string[] {
  const gaps: string[] = [];

  // Check auth gaps
  if (requirements.auth.needed) {
    const missingProviders = requirements.auth.methods.filter(
      m => !template.capabilities.auth.providers.includes(m)
    );
    if (missingProviders.length > 0) {
      gaps.push(`Auth providers: ${missingProviders.join(", ")}`);
    }
  }

  // Check feature gaps
  requirements.features.forEach(feature => {
    const name = feature.name.toLowerCase();
    if (name.includes("upload") && !template.capabilities.features.fileUploads) {
      gaps.push(`File uploads`);
    }
    if (name.includes("email") && !template.capabilities.features.email) {
      gaps.push(`Email functionality`);
    }
  });

  return gaps;
}
```

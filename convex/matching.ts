"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { TemplateCapabilities } from "./templates";
import { generateObject } from "ai";
import { z } from "zod";
import { getVertexProvider } from "./lib/vertex";

const weightsSchema = z.object({
  auth: z.number().min(0).max(1),
  database: z.number().min(0).max(1),
  payments: z.number().min(0).max(1),
  features: z.number().min(0).max(1),
  ui: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type Weights = {
  auth: number;
  database: number;
  payments: number;
  features: number;
  ui: number;
};

export type Requirements = {
  appName: string;
  tagline: string;
  appType: string;
  problemStatement: string;
  primaryUser: { type: string; coreNeed: string };
  secondaryUsers: Array<{ type: string; coreNeed: string }>;
  coreAction: string;
  hasPayments: boolean;
  paymentContext: string | null;
  platform: string;
  keyFeatures: string[];
  constraints: { timeline: string | null; mustHave: string[]; mustNotHave: string[] };
  devAgentNotes: string;
};

export type Template = {
  _id: string;
  slug?: string;
  name: string;
  description: string;
  sourceUrl: string;
  stack: string[];
  capabilities: TemplateCapabilities;
  tags?: string[];
  integrations?: string[];
  useCases?: string[];
  complexity?: "starter" | "intermediate" | "advanced";
  maintained?: boolean;
  lastVerified?: string;
};

export type MatchResult = {
  template: Template;
  score: number;
  scoreBreakdown: {
    auth: number;
    database: number;
    payments: number;
    features: number;
    ui: number;
  };
  weights: Weights;
  gaps: string[];
  included: string[];
};

export const DEFAULT_WEIGHTS: Weights = {
  auth: 0.25,
  database: 0.25,
  payments: 0.2,
  features: 0.2,
  ui: 0.1,
};

export function requirementsSummary(req: Requirements): string {
  const users = [req.primaryUser.type, ...req.secondaryUsers.map((u) => u.type)].join(", ");
  return `App: ${req.appName} (${req.appType})
Problem: ${req.problemStatement}
Users: ${users}
Core Action: ${req.coreAction}
Platform: ${req.platform}
Payments: ${req.hasPayments ? (req.paymentContext || "Yes") : "No"}
Key Features: ${req.keyFeatures.join(", ")}${req.constraints.mustHave.length > 0 ? `\nMust Have: ${req.constraints.mustHave.join(", ")}` : ""}${req.constraints.mustNotHave.length > 0 ? `\nMust Not Have: ${req.constraints.mustNotHave.join(", ")}` : ""}`;
}

async function determineWeights(requirements: Requirements): Promise<Weights> {
  try {
    const vertex = getVertexProvider();

    const prompt = `Analyze this app idea and determine the relative importance of each category for template matching.

${requirementsSummary(requirements)}

Based on this app's nature, assign weights (must sum to 1.0) to each category:
- auth: How important is authentication/authorization for this app?
- database: How important is database/data storage for this app?
- payments: How important is payment processing for this app?
- features: How important are specific features (file uploads, email, search, AI) for this app?
- ui: How important is the UI framework/admin dashboard for this app?

Examples:
- E-commerce app: payments=0.35, database=0.25, auth=0.20, features=0.15, ui=0.05
- Social network: database=0.30, auth=0.30, features=0.25, ui=0.10, payments=0.05
- SaaS dashboard: auth=0.25, database=0.25, ui=0.25, features=0.15, payments=0.10
- AI chatbot: features=0.40, database=0.25, auth=0.20, ui=0.10, payments=0.05`;

    const { object } = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: weightsSchema,
      prompt,
    });

    const sum = object.auth + object.database + object.payments + object.features + object.ui;
    if (Math.abs(sum - 1.0) > 0.01) {
      return {
        auth: object.auth / sum,
        database: object.database / sum,
        payments: object.payments / sum,
        features: object.features / sum,
        ui: object.ui / sum,
      };
    }

    return {
      auth: object.auth,
      database: object.database,
      payments: object.payments,
      features: object.features,
      ui: object.ui,
    };
  } catch (error) {
    console.error("Failed to determine weights via AI, using defaults:", error);
    return DEFAULT_WEIGHTS;
  }
}

// V1 scoring: infer needs from classification-level requirements
export function scoreAuth(
  _requirements: Requirements,
  tmplAuth: TemplateCapabilities["auth"]
): number {
  // Classification doesn't specify auth details — most apps need it.
  // Prefer templates with auth present; don't penalize extras.
  if (tmplAuth.present) return 90;
  return 40;
}

export function scoreDatabase(
  _requirements: Requirements,
  tmplDb: TemplateCapabilities["database"]
): number {
  // All apps need a database. Prefer present.
  if (!tmplDb.present) return 20;
  return 90;
}

export function scorePayments(
  requirements: Requirements,
  tmplPay: TemplateCapabilities["payments"]
): number {
  if (!requirements.hasPayments && !tmplPay.present) return 100;
  if (!requirements.hasPayments && tmplPay.present) return 80;
  if (requirements.hasPayments && !tmplPay.present) return 0;
  return 100;
}

export function scoreFeatures(
  requirements: Requirements,
  tmplFeatures: TemplateCapabilities["features"]
): number {
  const featureKeywords: Record<string, keyof TemplateCapabilities["features"]> = {
    upload: "fileUploads",
    file: "fileUploads",
    image: "fileUploads",
    email: "email",
    notification: "email",
    search: "search",
    find: "search",
    ai: "ai",
    chat: "ai",
    llm: "ai",
    gpt: "ai",
  };

  let checked = 0;
  let matches = 0;
  for (const feature of requirements.keyFeatures) {
    const lower = feature.toLowerCase();
    for (const [keyword, capability] of Object.entries(featureKeywords)) {
      if (lower.includes(keyword)) {
        checked++;
        if (tmplFeatures[capability]) matches++;
        break;
      }
    }
  }

  if (checked === 0) return 80;
  return Math.round(50 + (matches / checked) * 50);
}

export function scoreUI(
  _requirements: Requirements,
  tmplUI: TemplateCapabilities["ui"]
): number {
  let score = 50;
  if (tmplUI.framework === "shadcn") score += 30;
  else if (tmplUI.framework === "tailwind") score += 15;
  if (tmplUI.hasLandingPage) score += 10;
  return Math.min(100, score);
}

export function identifyGaps(
  requirements: Requirements,
  template: Template
): string[] {
  const gaps: string[] = [];
  const caps = template.capabilities;

  if (requirements.hasPayments && !caps.payments.present) {
    gaps.push("Payment processing");
  }

  for (const feature of requirements.keyFeatures) {
    const lower = feature.toLowerCase();
    if ((lower.includes("upload") || lower.includes("file") || lower.includes("image")) && !caps.features.fileUploads) {
      gaps.push("File uploads");
    }
    if ((lower.includes("email") || lower.includes("notification")) && !caps.features.email) {
      gaps.push("Email notifications");
    }
    if ((lower.includes("search") || lower.includes("find")) && !caps.features.search) {
      gaps.push("Search functionality");
    }
    if ((lower.includes("ai") || lower.includes("chat") || lower.includes("llm")) && !caps.features.ai) {
      gaps.push("AI/Chat features");
    }
  }

  for (const must of requirements.constraints.mustHave) {
    const lower = must.toLowerCase();
    if (lower.includes("realtime") && !caps.database.realtime) {
      gaps.push("Real-time data sync");
    }
    if (lower.includes("role") && !caps.auth.hasRoles) {
      gaps.push("User roles/permissions");
    }
    if (lower.includes("org") && !caps.auth.hasOrgs) {
      gaps.push("Organizations/teams");
    }
  }

  return [...new Set(gaps)];
}

export function identifyIncluded(template: Template): string[] {
  const included: string[] = [];
  const caps = template.capabilities;

  if (caps.auth.present) {
    included.push(`Authentication (${caps.auth.providers.join(", ")})`);
    if (caps.auth.hasRoles) included.push("Role-based access");
    if (caps.auth.hasOrgs) included.push("Organizations/teams");
  }

  if (caps.database.present) {
    included.push(`Database (${caps.database.type})`);
    if (caps.database.realtime) included.push("Real-time sync");
  }

  if (caps.payments.present) {
    const models = caps.payments.models?.join(", ") || "";
    included.push(`Payments via ${caps.payments.provider} (${models})`);
  }

  if (caps.ui.hasAdminDashboard) included.push("Admin dashboard");
  if (caps.ui.hasLandingPage) included.push("Landing page");

  if (caps.features.fileUploads) included.push("File uploads");
  if (caps.features.email) included.push("Email notifications");
  if (caps.features.search) included.push("Search");
  if (caps.features.ai) included.push("AI integration");

  return included;
}

export const matchTemplate = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<MatchResult> => {
    const project = await ctx.runQuery(api.projects.get, {
      projectId: args.projectId,
    });

    if (!project?.requirements) {
      throw new Error("Project has no requirements");
    }

    const requirements = project.requirements as Requirements;
    if (!Array.isArray(requirements.keyFeatures)) {
      requirements.keyFeatures = [];
    }
    if (!requirements.constraints) {
      requirements.constraints = { timeline: null, mustHave: [], mustNotHave: [] };
    }
    const templates = (await ctx.runQuery(api.templates.list, {})) as Template[];

    if (templates.length === 0) {
      throw new Error("No templates available");
    }

    const weights = await determineWeights(requirements);

    let bestMatch: MatchResult | null = null;

    for (const template of templates) {
      const caps = template.capabilities;

      const scoreBreakdown = {
        auth: scoreAuth(requirements, caps.auth),
        database: scoreDatabase(requirements, caps.database),
        payments: scorePayments(requirements, caps.payments),
        features: scoreFeatures(requirements, caps.features),
        ui: scoreUI(requirements, caps.ui),
      };

      const totalScore = Math.round(
        scoreBreakdown.auth * weights.auth +
          scoreBreakdown.database * weights.database +
          scoreBreakdown.payments * weights.payments +
          scoreBreakdown.features * weights.features +
          scoreBreakdown.ui * weights.ui
      );

      const result: MatchResult = {
        template,
        score: totalScore,
        scoreBreakdown,
        weights,
        gaps: identifyGaps(requirements, template),
        included: identifyIncluded(template),
      };

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = result;
      }
    }

    if (bestMatch!.score < 50) {
      const minimalStarter = templates.find((t) => t.name === "Minimal Starter");
      if (minimalStarter) {
        bestMatch = {
          template: minimalStarter,
          score: bestMatch!.score,
          scoreBreakdown: bestMatch!.scoreBreakdown,
          weights,
          gaps: identifyGaps(requirements, minimalStarter),
          included: identifyIncluded(minimalStarter),
        };
      }
    }

    await ctx.runMutation(api.projects.setMatchedTemplate, {
      projectId: args.projectId,
      templateId: bestMatch!.template._id,
      templateName: bestMatch!.template.name,
      matchScore: bestMatch!.score,
      matchGaps: bestMatch!.gaps,
    });

    return bestMatch!;
  },
});

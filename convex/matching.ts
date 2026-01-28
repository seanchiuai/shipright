"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { TemplateCapabilities } from "./templates";

// Requirements schema from interview
type Requirements = {
  appName: string;
  problemStatement: string;
  userTypes: Array<{ name: string; description: string; isAdmin: boolean }>;
  auth: {
    needed: boolean;
    methods: string[];
    hasRoles: boolean;
    hasOrgs: boolean;
  };
  database: { needed: boolean; realtime: boolean };
  payments: { needed: boolean; model?: string };
  features: Array<{ name: string; description: string; priority: string }>;
  integrations: string[];
};

type Template = {
  _id: string;
  name: string;
  description: string;
  sourceUrl: string;
  stack: string[];
  capabilities: TemplateCapabilities;
};

type MatchResult = {
  template: Template;
  score: number;
  scoreBreakdown: {
    auth: number;
    database: number;
    payments: number;
    features: number;
    ui: number;
  };
  gaps: string[];
  included: string[];
};

// Scoring weights as per PRD
const WEIGHTS = {
  auth: 0.25,
  database: 0.25,
  payments: 0.2,
  features: 0.2,
  ui: 0.1,
};

function scoreAuth(
  reqAuth: Requirements["auth"],
  tmplAuth: TemplateCapabilities["auth"]
): number {
  // Neither needs nor has auth - perfect match
  if (!reqAuth.needed && !tmplAuth.present) return 100;
  // Has auth but not needed - slight overhead, still good
  if (!reqAuth.needed && tmplAuth.present) return 80;
  // Needs auth but template doesn't have it - deal breaker
  if (reqAuth.needed && !tmplAuth.present) return 0;

  let score = 100;

  // Check auth providers match
  if (reqAuth.methods && reqAuth.methods.length > 0) {
    const matchedProviders = reqAuth.methods.filter((m) =>
      tmplAuth.providers.includes(m.toLowerCase())
    );
    const matchRatio = matchedProviders.length / reqAuth.methods.length;
    score *= matchRatio;
  }

  // Check roles/orgs requirements
  if (reqAuth.hasRoles && !tmplAuth.hasRoles) score *= 0.7;
  if (reqAuth.hasOrgs && !tmplAuth.hasOrgs) score *= 0.7;

  return Math.round(score);
}

function scoreDatabase(
  reqDb: Requirements["database"],
  tmplDb: TemplateCapabilities["database"]
): number {
  // Neither needs nor has database
  if (!reqDb.needed && !tmplDb.present) return 100;
  // Has database but not needed
  if (!reqDb.needed && tmplDb.present) return 80;
  // Needs database but template doesn't have it
  if (reqDb.needed && !tmplDb.present) return 0;

  let score = 100;

  // Realtime requirement
  if (reqDb.realtime && !tmplDb.realtime) score *= 0.5;

  return Math.round(score);
}

function scorePayments(
  reqPay: Requirements["payments"],
  tmplPay: TemplateCapabilities["payments"]
): number {
  // Neither needs nor has payments
  if (!reqPay.needed && !tmplPay.present) return 100;
  // Has payments but not needed
  if (!reqPay.needed && tmplPay.present) return 80;
  // Needs payments but template doesn't have it
  if (reqPay.needed && !tmplPay.present) return 0;

  let score = 100;

  // Check payment model match
  if (reqPay.model && tmplPay.models) {
    if (!tmplPay.models.includes(reqPay.model)) {
      score *= 0.6;
    }
  }

  return Math.round(score);
}

function scoreFeatures(
  reqFeatures: Requirements["features"],
  tmplFeatures: TemplateCapabilities["features"]
): number {
  // Extract must-have features
  const mustFeatures = reqFeatures.filter((f) => f.priority === "must");
  if (mustFeatures.length === 0) return 100;

  let matches = 0;
  const featureKeywords: Record<string, keyof TemplateCapabilities["features"]> =
    {
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

  for (const feature of mustFeatures) {
    const name = feature.name.toLowerCase();
    for (const [keyword, capability] of Object.entries(featureKeywords)) {
      if (name.includes(keyword) && tmplFeatures[capability]) {
        matches++;
        break;
      }
    }
  }

  // Give partial credit even if no keyword matches (features can be built)
  const baseScore = 50; // Base score for having to build features
  const matchBonus = (matches / mustFeatures.length) * 50;

  return Math.round(baseScore + matchBonus);
}

function scoreUI(
  requirements: Requirements,
  tmplUI: TemplateCapabilities["ui"]
): number {
  let score = 50; // Base score

  // Prefer shadcn/ui for better component library
  if (tmplUI.framework === "shadcn") score += 25;
  else if (tmplUI.framework === "tailwind") score += 15;

  // Admin dashboard for apps with admin users
  const hasAdmin = requirements.userTypes?.some((u) => u.isAdmin);
  if (hasAdmin) {
    if (tmplUI.hasAdminDashboard) score += 25;
    else score -= 15;
  } else {
    // No admin needed, having dashboard is slight bonus
    if (tmplUI.hasAdminDashboard) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function identifyGaps(
  requirements: Requirements,
  template: Template
): string[] {
  const gaps: string[] = [];
  const caps = template.capabilities;

  // Auth gaps
  if (requirements.auth.needed) {
    if (!caps.auth.present) {
      gaps.push("User authentication");
    } else {
      const missingProviders = requirements.auth.methods.filter(
        (m) => !caps.auth.providers.includes(m.toLowerCase())
      );
      if (missingProviders.length > 0) {
        gaps.push(`Auth providers: ${missingProviders.join(", ")}`);
      }
      if (requirements.auth.hasRoles && !caps.auth.hasRoles) {
        gaps.push("User roles/permissions");
      }
      if (requirements.auth.hasOrgs && !caps.auth.hasOrgs) {
        gaps.push("Organizations/teams");
      }
    }
  }

  // Database gaps
  if (requirements.database.needed && !caps.database.present) {
    gaps.push("Database");
  } else if (requirements.database.realtime && !caps.database.realtime) {
    gaps.push("Real-time data sync");
  }

  // Payments gaps
  if (requirements.payments.needed && !caps.payments.present) {
    gaps.push("Payment processing");
  }

  // Feature gaps
  for (const feature of requirements.features) {
    if (feature.priority !== "must") continue;
    const name = feature.name.toLowerCase();

    if (name.includes("upload") && !caps.features.fileUploads) {
      gaps.push("File uploads");
    }
    if (name.includes("email") && !caps.features.email) {
      gaps.push("Email notifications");
    }
    if (name.includes("search") && !caps.features.search) {
      gaps.push("Search functionality");
    }
    if ((name.includes("ai") || name.includes("chat")) && !caps.features.ai) {
      gaps.push("AI/Chat features");
    }
  }

  // Remove duplicates
  return [...new Set(gaps)];
}

function identifyIncluded(template: Template): string[] {
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
    // Get project with requirements
    const project = await ctx.runQuery(api.projects.get, {
      projectId: args.projectId,
    });

    if (!project?.requirements) {
      throw new Error("Project has no requirements");
    }

    const requirements = project.requirements as Requirements;

    // Get all templates
    const templates = (await ctx.runQuery(api.templates.list, {})) as Template[];

    if (templates.length === 0) {
      throw new Error("No templates available. Please seed templates first.");
    }

    let bestMatch: MatchResult | null = null;

    for (const template of templates) {
      const caps = template.capabilities;

      const scoreBreakdown = {
        auth: scoreAuth(requirements.auth, caps.auth),
        database: scoreDatabase(requirements.database, caps.database),
        payments: scorePayments(requirements.payments, caps.payments),
        features: scoreFeatures(requirements.features, caps.features),
        ui: scoreUI(requirements, caps.ui),
      };

      const totalScore = Math.round(
        scoreBreakdown.auth * WEIGHTS.auth +
          scoreBreakdown.database * WEIGHTS.database +
          scoreBreakdown.payments * WEIGHTS.payments +
          scoreBreakdown.features * WEIGHTS.features +
          scoreBreakdown.ui * WEIGHTS.ui
      );

      const result: MatchResult = {
        template,
        score: totalScore,
        scoreBreakdown,
        gaps: identifyGaps(requirements, template),
        included: identifyIncluded(template),
      };

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = result;
      }
    }

    // Fallback to minimal starter if score < 50%
    if (bestMatch!.score < 50) {
      const minimalStarter = templates.find((t) => t.name === "Minimal Starter");
      if (minimalStarter) {
        bestMatch = {
          template: minimalStarter,
          score: bestMatch!.score,
          scoreBreakdown: bestMatch!.scoreBreakdown,
          gaps: identifyGaps(requirements, minimalStarter),
          included: identifyIncluded(minimalStarter),
        };
      }
    }

    // Save matched template to project
    await ctx.runMutation(api.projects.setMatchedTemplate, {
      projectId: args.projectId,
      templateId: bestMatch!.template._id,
      matchScore: bestMatch!.score,
      matchGaps: bestMatch!.gaps,
    });

    return bestMatch!;
  },
});

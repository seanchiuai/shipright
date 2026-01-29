"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { TemplateCapabilities } from "./templates";
import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";

function getVertexProvider() {
  return createVertex({
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    googleAuthOptions: {
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    },
  });
}

const weightsSchema = z.object({
  auth: z.number().min(0).max(1),
  database: z.number().min(0).max(1),
  payments: z.number().min(0).max(1),
  features: z.number().min(0).max(1),
  ui: z.number().min(0).max(1),
  reasoning: z.string(),
});

type Weights = {
  auth: number;
  database: number;
  payments: number;
  features: number;
  ui: number;
};

type Requirements = {
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

type Template = {
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
  weights: Weights;
  gaps: string[];
  included: string[];
};

type RankedTemplate = {
  slug: string;
  name: string;
  score: number;
  tagScore: number;
  aiScore: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  template: Template;
};

type MatchResultV2 = {
  topMatches: RankedTemplate[];
  bestMatch: RankedTemplate;
  extractedTags: string[];
};

const DEFAULT_WEIGHTS: Weights = {
  auth: 0.25,
  database: 0.25,
  payments: 0.2,
  features: 0.2,
  ui: 0.1,
};

function requirementsSummary(req: Requirements): string {
  const users = [req.primaryUser.type, ...req.secondaryUsers.map((u) => u.type)].join(", ");
  return `App: ${req.appName} (${req.appType})
Problem: ${req.problemStatement}
Users: ${users}
Core Action: ${req.coreAction}
Platform: ${req.platform}
Payments: ${req.hasPayments ? (req.paymentContext || "Yes") : "No"}
Key Features: ${req.keyFeatures.join(", ")}${req.constraints.mustHave.length > 0 ? `\nMust Have: ${req.constraints.mustHave.join(", ")}` : ""}${req.constraints.mustNotHave.length > 0 ? `\nMust Not Have: ${req.constraints.mustNotHave.join(", ")}` : ""}`;
}

// Helper: check if any keyFeature mentions a keyword
function featuresInclude(features: string[], ...keywords: string[]): boolean {
  return features.some((f) => {
    const lower = f.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  });
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
function scoreAuth(
  _requirements: Requirements,
  tmplAuth: TemplateCapabilities["auth"]
): number {
  // Classification doesn't specify auth details — most apps need it.
  // Prefer templates with auth present; don't penalize extras.
  if (tmplAuth.present) return 90;
  return 40;
}

function scoreDatabase(
  _requirements: Requirements,
  tmplDb: TemplateCapabilities["database"]
): number {
  // All apps need a database. Prefer present.
  if (!tmplDb.present) return 20;
  return 90;
}

function scorePayments(
  requirements: Requirements,
  tmplPay: TemplateCapabilities["payments"]
): number {
  if (!requirements.hasPayments && !tmplPay.present) return 100;
  if (!requirements.hasPayments && tmplPay.present) return 80;
  if (requirements.hasPayments && !tmplPay.present) return 0;
  return 100;
}

function scoreFeatures(
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

function scoreUI(
  _requirements: Requirements,
  tmplUI: TemplateCapabilities["ui"]
): number {
  let score = 50;
  if (tmplUI.framework === "shadcn") score += 30;
  else if (tmplUI.framework === "tailwind") score += 15;
  if (tmplUI.hasLandingPage) score += 10;
  return Math.min(100, score);
}

function identifyGaps(
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

import tagsTaxonomy from "../data/tags-taxonomy.json";

const tagExtractionSchema = z.object({
  tags: z.array(z.string()),
  reasoning: z.string(),
});

const rankingSchema = z.object({
  rankings: z.array(
    z.object({
      slug: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ),
});

async function extractTagsFromRequirements(
  requirements: Requirements
): Promise<string[]> {
  try {
    const vertex = getVertexProvider();
    const availableTags = tagsTaxonomy.allTags;

    const prompt = `Analyze these app requirements and select the most relevant tags from the available list.

${requirementsSummary(requirements)}

Available tags (hierarchical, e.g., "ai" is parent of "ai:openai"):
${availableTags.join(", ")}

Select 5-15 tags that best describe what this app needs. Include both specific tags (e.g., "auth:clerk") and general category tags (e.g., "auth") when relevant.`;

    const { object } = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: tagExtractionSchema,
      prompt,
    });

    return object.tags.filter((tag) => availableTags.includes(tag));
  } catch (error) {
    console.error("Failed to extract tags via AI, using fallback:", error);
    const tags: string[] = ["auth", "database"];
    if (requirements.hasPayments) tags.push("payments");
    if (featuresInclude(requirements.keyFeatures, "ai", "chat", "llm", "gpt")) {
      tags.push("ai");
    }
    if (featuresInclude(requirements.keyFeatures, "realtime", "real-time", "live")) {
      tags.push("realtime");
    }
    return tags;
  }
}

function calculateTagOverlap(
  userTags: string[],
  templateTags: string[]
): number {
  if (userTags.length === 0) return 0;

  let totalScore = 0;

  for (const userTag of userTags) {
    if (templateTags.includes(userTag)) {
      totalScore += 1.0;
      continue;
    }

    const userParts = userTag.split(":");
    const userParent = userParts.slice(0, -1).join(":");

    for (const tmplTag of templateTags) {
      if (tmplTag.startsWith(userTag + ":")) {
        totalScore += 0.7;
        break;
      }

      if (userTag.startsWith(tmplTag + ":")) {
        totalScore += 0.5;
        break;
      }

      if (userParent && userParts.length > 1) {
        const tmplParent = tmplTag.split(":").slice(0, -1).join(":");
        if (userParent === tmplParent) {
          totalScore += 0.3;
          break;
        }
      }
    }
  }

  return totalScore / userTags.length;
}

function filterTemplatesByTags(
  templates: Template[],
  userTags: string[]
): Array<{ template: Template; tagScore: number }> {
  const scored = templates.map((template) => {
    const tagScore = calculateTagOverlap(userTags, template.tags || []);
    return { template, tagScore };
  });

  const filtered = scored.filter(({ template, tagScore }) => {
    if (tagScore >= 0.3) return true;
    return userTags.some((tag) => (template.tags || []).includes(tag));
  });

  return filtered.sort((a, b) => b.tagScore - a.tagScore).slice(0, 20);
}

async function rankCandidates(
  candidates: Array<{ template: Template; tagScore: number }>,
  requirements: Requirements
): Promise<RankedTemplate[]> {
  if (candidates.length === 0) return [];

  try {
    const vertex = getVertexProvider();

    const candidateDescriptions = candidates
      .map(
        ({ template, tagScore }) =>
          `- ${template.slug || template.name}: ${template.description} (Stack: ${template.stack.join(", ")}, Tags: ${(template.tags || []).join(", ")}, Tag Score: ${(tagScore * 100).toFixed(0)}%)`
      )
      .join("\n");

    const prompt = `Rank these template candidates for the following app requirements.

${requirementsSummary(requirements)}

Candidate Templates:
${candidateDescriptions}

Rank the TOP 5 templates by how well they match the requirements. For each:
1. Score (0-100): How well does this template fit?
2. Reasoning: Why this score? (1-2 sentences)
3. Pros: 2-3 strengths for this use case
4. Cons: 1-2 limitations or things that would need to be added

Return candidates by their slug/name identifier.`;

    const { object } = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: rankingSchema,
      prompt,
    });

    const rankedTemplates: RankedTemplate[] = [];
    for (const ranking of object.rankings.slice(0, 5)) {
      const candidate = candidates.find(
        (c) =>
          (c.template.slug || c.template.name).toLowerCase() ===
          ranking.slug.toLowerCase()
      );
      if (candidate) {
        rankedTemplates.push({
          slug: candidate.template.slug || candidate.template.name,
          name: candidate.template.name,
          score: Math.round(candidate.tagScore * 40 + ranking.score * 0.6),
          tagScore: Math.round(candidate.tagScore * 100),
          aiScore: ranking.score,
          reasoning: ranking.reasoning,
          pros: ranking.pros,
          cons: ranking.cons,
          template: candidate.template,
        });
      }
    }

    return rankedTemplates.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("Failed to rank candidates via AI, using tag scores:", error);
    return candidates.slice(0, 5).map(({ template, tagScore }) => ({
      slug: template.slug || template.name,
      name: template.name,
      score: Math.round(tagScore * 100),
      tagScore: Math.round(tagScore * 100),
      aiScore: 0,
      reasoning: "Ranked by tag match (AI unavailable)",
      pros: identifyIncluded(template).slice(0, 3),
      cons: [],
      template,
    }));
  }
}

export const matchTemplateV2 = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<MatchResultV2> => {
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
    const templates = (await ctx.runQuery(
      api.templates.list,
      {}
    )) as Template[];

    if (templates.length === 0) {
      throw new Error("No templates available");
    }

    const extractedTags = await extractTagsFromRequirements(requirements);

    let candidates = filterTemplatesByTags(templates, extractedTags);
    if (candidates.length === 0) {
      candidates = templates.map((t) => ({ template: t, tagScore: 0 }));
    }

    let rankedMatches = await rankCandidates(candidates, requirements);
    if (rankedMatches.length === 0) {
      const minimalStarter = templates.find(
        (t) => t.slug === "minimal-starter" || t.name === "Minimal Starter"
      );
      if (minimalStarter) {
        rankedMatches = [
          {
            slug: minimalStarter.slug || "minimal-starter",
            name: minimalStarter.name,
            score: 30,
            tagScore: 0,
            aiScore: 30,
            reasoning: "Default fallback template for custom builds",
            pros: ["Clean starting point", "No unnecessary dependencies"],
            cons: ["Requires building most features from scratch"],
            template: minimalStarter,
          },
        ];
      }
    }

    const bestMatch = rankedMatches[0];

    await ctx.runMutation(api.projects.setMatchedTemplate, {
      projectId: args.projectId,
      templateId: bestMatch.template._id,
      matchScore: bestMatch.score,
      matchGaps: identifyGaps(requirements, bestMatch.template),
    });

    return {
      topMatches: rankedMatches,
      bestMatch,
      extractedTags,
    };
  },
});

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
      matchScore: bestMatch!.score,
      matchGaps: bestMatch!.gaps,
    });

    return bestMatch!;
  },
});

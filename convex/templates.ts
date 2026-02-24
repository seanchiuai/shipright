import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

// Import template data from JSON (bundled at build time)
import templatesData from "../data/templates.json";

// Deep equality check that handles different key orders
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(aObj[k], bObj[k]));
  }
  return false;
};

// Template capabilities type (matches JSON schema)
export type TemplateCapabilities = {
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

// Query: List all templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

// Internal: List templates without auth (for blueprint generation)
export const listInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

// Query: Get template by ID
export const get = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Query: Get template by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/** Core sync logic (shared between public and internal mutations) */
async function syncTemplatesCore(ctx: { db: import("./_generated/server").MutationCtx["db"] }) {
  const stats = { added: 0, updated: 0, unchanged: 0, errors: [] as string[] };

  for (const template of templatesData.templates) {
    try {
      if (!template.slug || !template.name || !template.sourceUrl) {
        stats.errors.push(`Invalid template: missing required fields (slug: ${template.slug})`);
        continue;
      }

      let existing = await ctx.db
        .query("templates")
        .withIndex("by_slug", (q) => q.eq("slug", template.slug))
        .first();

      if (!existing) {
        const allTemplates = await ctx.db.query("templates").collect();
        existing = allTemplates.find((t) => t.name === template.name) || null;
      }

      if (existing) {
        const hasChanges =
          existing.slug !== template.slug ||
          existing.name !== template.name ||
          existing.description !== template.description ||
          existing.sourceUrl !== template.sourceUrl ||
          !deepEqual(existing.stack, template.stack) ||
          !deepEqual(existing.capabilities, template.capabilities) ||
          !deepEqual(existing.tags, template.tags) ||
          !deepEqual(existing.integrations, template.integrations) ||
          !deepEqual(existing.useCases, template.useCases) ||
          existing.complexity !== template.complexity ||
          existing.maintained !== template.maintained ||
          existing.lastVerified !== template.lastVerified;

        if (hasChanges) {
          await ctx.db.patch(existing._id, {
            slug: template.slug,
            name: template.name,
            description: template.description,
            sourceUrl: template.sourceUrl,
            stack: template.stack,
            capabilities: template.capabilities,
            tags: template.tags,
            integrations: template.integrations,
            useCases: template.useCases,
            complexity: template.complexity as "starter" | "intermediate" | "advanced" | undefined,
            maintained: template.maintained,
            lastVerified: template.lastVerified,
          });
          stats.updated++;
        } else {
          stats.unchanged++;
        }
      } else {
        await ctx.db.insert("templates", {
          slug: template.slug,
          name: template.name,
          description: template.description,
          sourceUrl: template.sourceUrl,
          stack: template.stack,
          capabilities: template.capabilities,
          tags: template.tags,
          integrations: template.integrations,
          useCases: template.useCases,
          complexity: template.complexity as "starter" | "intermediate" | "advanced" | undefined,
          maintained: template.maintained,
          lastVerified: template.lastVerified,
        });
        stats.added++;
      }
    } catch (error) {
      stats.errors.push(`Error processing ${template.slug}: ${error}`);
    }
  }

  return {
    message: `Sync complete: ${stats.added} added, ${stats.updated} updated, ${stats.unchanged} unchanged`,
    ...stats,
    total: templatesData.templates.length,
  };
}

// Mutation: Sync templates from JSON file (public, requires auth)
// - Inserts new templates (by slug)
// - Updates existing templates (matches by slug, falls back to name)
// - Does NOT delete orphaned templates
export const sync = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return syncTemplatesCore(ctx);
  },
});

// Internal mutation: Sync templates without auth (for CLI/post-deploy seeding)
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    return syncTemplatesCore(ctx);
  },
});


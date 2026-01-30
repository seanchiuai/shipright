import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Import template data from JSON (bundled at build time)
import templatesData from "../data/templates.json";

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

// Mutation: Sync templates from JSON file
// - Inserts new templates (by slug)
// - Updates existing templates (matches by slug, falls back to name)
// - Does NOT delete orphaned templates
export const sync = mutation({
  args: {},
  handler: async (ctx) => {
    const stats = { added: 0, updated: 0, unchanged: 0, errors: [] as string[] };

    for (const template of templatesData.templates) {
      try {
        // Validate required fields
        if (!template.slug || !template.name || !template.sourceUrl) {
          stats.errors.push(`Invalid template: missing required fields (slug: ${template.slug})`);
          continue;
        }

        // Check if template exists by slug first
        let existing = await ctx.db
          .query("templates")
          .withIndex("by_slug", (q) => q.eq("slug", template.slug))
          .first();

        // Fallback: check by name for templates without slugs (backwards compat)
        if (!existing) {
          const allTemplates = await ctx.db.query("templates").collect();
          existing = allTemplates.find((t) => t.name === template.name) || null;
        }

        if (existing) {
          // Update existing template (including adding slug if missing)
          // Deep equality check that handles different key orders
          const deepEqual = (a: unknown, b: unknown): boolean => {
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
          // Insert new template
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
  },
});


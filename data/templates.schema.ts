import { z } from "zod";

// Capabilities sub-schemas
export const authCapabilitiesSchema = z.object({
  present: z.boolean(),
  providers: z.array(z.string()),
  hasRoles: z.boolean(),
  hasOrgs: z.boolean(),
});

export const databaseCapabilitiesSchema = z.object({
  present: z.boolean(),
  type: z.string(),
  realtime: z.boolean(),
});

export const paymentsCapabilitiesSchema = z.object({
  present: z.boolean(),
  provider: z.string().optional(),
  models: z.array(z.string()).optional(),
});

export const uiCapabilitiesSchema = z.object({
  framework: z.string(),
  hasAdminDashboard: z.boolean(),
  hasLandingPage: z.boolean(),
});

export const featuresCapabilitiesSchema = z.object({
  fileUploads: z.boolean(),
  email: z.boolean(),
  search: z.boolean(),
  ai: z.boolean(),
});

export const capabilitiesSchema = z.object({
  auth: authCapabilitiesSchema,
  database: databaseCapabilitiesSchema,
  payments: paymentsCapabilitiesSchema,
  ui: uiCapabilitiesSchema,
  features: featuresCapabilitiesSchema,
});

// Template schema
export const templateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  description: z.string().min(1),
  sourceUrl: z.string().url(),
  stack: z.array(z.string()).min(1),
  capabilities: capabilitiesSchema,
  tags: z.array(z.string()).optional(),
  integrations: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  complexity: z.enum(["starter", "intermediate", "advanced"]).optional(),
  maintained: z.boolean().optional(),
  lastVerified: z.string().optional(),
});

// Templates file schema
export const templatesFileSchema = z.object({
  version: z.string(),
  templates: z.array(templateSchema).min(1),
});

// TypeScript types
export type Template = z.infer<typeof templateSchema>;
export type TemplatesFile = z.infer<typeof templatesFileSchema>;
export type Capabilities = z.infer<typeof capabilitiesSchema>;

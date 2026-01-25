import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client for managing generated app databases
 * Uses service key for full access
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Create tenant-specific tables for a new project
 */
export async function createTenantSchema(projectId: string) {
  // Create a schema prefix for this tenant
  const schemaPrefix = `tenant_${projectId.replace(/-/g, "_")}`;

  // Note: Actual table creation will be done by Claude Code
  // based on the generated app's requirements
  return schemaPrefix;
}

/**
 * Delete all tables for a tenant
 */
export async function deleteTenantSchema(schemaPrefix: string) {
  // This would need to query and drop all tables with this prefix
  // Implementation depends on the exact multi-tenancy strategy
  console.log(`Deleting tenant schema: ${schemaPrefix}`);
}

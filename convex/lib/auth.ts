import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("User not found");

  return user;
}

export async function getOwnedProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">
) {
  const user = await getAuthenticatedUser(ctx);
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  if (project.userId !== user._id) throw new Error("Access denied");
  return { user, project };
}

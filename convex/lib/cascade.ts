import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function deleteProjectData(ctx: MutationCtx, projectId: Id<"projects">) {
  // Delete interview messages
  const messages = await ctx.db
    .query("interviewMessages")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  for (const msg of messages) {
    await ctx.db.delete(msg._id);
  }

  // Delete interview sessions
  const sessions = await ctx.db
    .query("interviewSessions")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  for (const session of sessions) {
    await ctx.db.delete(session._id);
  }
}

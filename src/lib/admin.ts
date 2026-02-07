/**
 * Client-side admin check for UI gating only.
 * Actual data protection is enforced server-side in Convex queries.
 */
export function isAdmin(clerkUserId: string): boolean {
  if (!clerkUserId) return false;
  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  if (!adminId) return false;
  return clerkUserId === adminId;
}

/** Validate a redirect path is safe (no open redirect). */
export function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  // Block protocol-relative URLs (//evil.com)
  if (path.startsWith("//")) return false;
  // Block backslash tricks (\/evil.com)
  if (path.startsWith("/\\")) return false;
  // Only allow simple path characters
  if (!/^\/[\w\-\/\.\?\&\=\%\#]*$/.test(path)) return false;
  return true;
}

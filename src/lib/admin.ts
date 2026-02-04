export function isAdmin(clerkUserId: string): boolean {
  if (!clerkUserId) return false;
  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  if (!adminId) return false;
  return clerkUserId === adminId;
}

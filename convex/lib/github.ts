import { Octokit } from "octokit";

export type RepoStatus =
  | { accessible: true }
  | {
      accessible: false;
      reason:
        | "deleted"
        | "renamed"
        | "permission_denied"
        | "token_expired"
        | "unknown";
      message: string;
    };

const ERROR_MESSAGES: Record<string, string> = {
  deleted:
    "Your GitHub repository was deleted. Create a new one to continue.",
  renamed: "Your GitHub repository was renamed or moved.",
  permission_denied:
    "You no longer have write access to this repository.",
  token_expired: "Your GitHub connection has expired.",
};

/**
 * Check if a GitHub repo exists and is accessible with the given token.
 * Maps HTTP status codes to user-friendly RepoStatus.
 */
export async function validateRepoAccess(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepoStatus> {
  try {
    await octokit.rest.repos.get({ owner, repo });
    return { accessible: true };
  } catch (error: unknown) {
    const status = (error as { status?: number }).status;
    const msg =
      error instanceof Error ? error.message : "Unknown error";

    if (status === 404) {
      return {
        accessible: false,
        reason: "deleted",
        message: ERROR_MESSAGES.deleted,
      };
    }
    if (status === 401) {
      return {
        accessible: false,
        reason: "token_expired",
        message: ERROR_MESSAGES.token_expired,
      };
    }
    if (status === 403) {
      return {
        accessible: false,
        reason: "permission_denied",
        message: ERROR_MESSAGES.permission_denied,
      };
    }

    return {
      accessible: false,
      reason: "unknown",
      message: `Unable to access repository: ${msg}`,
    };
  }
}

/**
 * Parse "owner/repo" into { owner, repo } or null if invalid.
 */
export function parseRepoFullName(
  fullName: string
): { owner: string; repo: string } | null {
  if (!fullName) return null;
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1] };
}

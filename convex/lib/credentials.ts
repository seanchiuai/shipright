/**
 * Unified Credential Manager
 *
 * Single abstraction for provisioning credentials to Daytona sandboxes.
 * Handles Claude Code OAuth, GitHub tokens, and git credential storage.
 */

import type { Sandbox } from "@daytonaio/sdk";

// Credential structures
export interface ClaudeCredentials {
  credentialsJson: string; // Raw JSON for ~/.claude/.credentials.json
  oauthAccountJson?: string; // Raw JSON for oauthAccount in ~/.claude.json
}

export interface GitCredentials {
  token: string;
  credentialUrl: string; // https://x-access-token:TOKEN@github.com
}

export interface SandboxCredentials {
  claude: ClaudeCredentials;
  git: GitCredentials;
}

// Errors
export class CredentialError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "CredentialError";
  }
}

/**
 * Build credentials object from environment variables and user token.
 * Call this in the action before creating the sandbox.
 */
export function buildSandboxCredentials(githubToken: string): SandboxCredentials {
  const claudeCredsJson = process.env.CLAUDE_CODE_CREDENTIALS_JSON;
  if (!claudeCredsJson) {
    throw new CredentialError(
      "CLAUDE_CODE_CREDENTIALS_JSON not configured",
      "Set this env var in Convex dashboard. Get value from macOS Keychain: security find-generic-password -s 'Claude Code-credentials' -w",
    );
  }

  const oauthAccountJson = process.env.CLAUDE_CODE_OAUTH_ACCOUNT_JSON;

  return {
    claude: {
      credentialsJson: claudeCredsJson,
      oauthAccountJson,
    },
    git: {
      token: githubToken,
      credentialUrl: `https://x-access-token:${githubToken}@github.com\n`,
    },
  };
}

/**
 * Provision all credentials to sandbox filesystem.
 * Call this after sandbox creation, before running Claude Code.
 */
export async function provisionSandboxCredentials(
  sandbox: Sandbox,
  creds: SandboxCredentials,
): Promise<void> {
  // Get home directory
  const homeResult = await sandbox.process.executeCommand("echo $HOME");
  const homeDir = (homeResult.result || "").trim() || "/home/daytona";

  // 1. Claude Code credentials (~/.claude/.credentials.json)
  await sandbox.process.executeCommand("mkdir -p ~/.claude");
  await sandbox.fs.uploadFile(
    Buffer.from(creds.claude.credentialsJson, "utf-8"),
    `${homeDir}/.claude/.credentials.json`,
  );

  // 2. Claude Code config (~/.claude.json with oauthAccount)
  if (creds.claude.oauthAccountJson) {
    const claudeJson = JSON.stringify({
      oauthAccount: JSON.parse(creds.claude.oauthAccountJson),
    });
    await sandbox.fs.uploadFile(
      Buffer.from(claudeJson, "utf-8"),
      `${homeDir}/.claude.json`,
    );
  }

  // 3. Git credentials (~/.git-credentials + credential.helper)
  await sandbox.fs.uploadFile(
    Buffer.from(creds.git.credentialUrl, "utf-8"),
    `${homeDir}/.git-credentials`,
  );
  await sandbox.process.executeCommand("git config --global credential.helper store");

  // 4. Git identity for commits
  await sandbox.process.executeCommand('git config --global user.name "Shipright"');
  await sandbox.process.executeCommand('git config --global user.email "bot@shipright.dev"');
}

/**
 * Validate that all required credentials are available.
 * Call this at the start of scaffolding pipeline.
 */
export function validateCredentialsAvailable(githubToken: string | undefined): void {
  const missing: string[] = [];

  if (!process.env.CLAUDE_CODE_CREDENTIALS_JSON) {
    missing.push("CLAUDE_CODE_CREDENTIALS_JSON");
  }
  if (!process.env.DAYTONA_API_KEY) {
    missing.push("DAYTONA_API_KEY");
  }
  if (!githubToken) {
    missing.push("User GitHub token");
  }

  if (missing.length > 0) {
    throw new CredentialError(
      `Missing credentials: ${missing.join(", ")}`,
      missing.includes("User GitHub token")
        ? "User needs to reconnect GitHub account"
        : "Check Convex environment variables",
    );
  }
}

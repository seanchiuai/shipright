# Daytona Sandbox Reference

Daytona SDK usage, sandbox lifecycle, and scaffolding injection patterns for Shipright.

## Installation

```bash
npm install @daytonaio/sdk
```

## Creating a Sandbox (Convex Action)

```typescript
// convex/scaffolding.ts
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
});

// Non-ephemeral sandbox (persists across actions for polling)
const sandbox = await daytona.create({
  language: "typescript",
  autoStopInterval: 30, // Stop after 30 min inactivity
  envVars: { GITHUB_TOKEN: decryptedGithubToken },
  labels: { project: "shipright", projectId },
}, { timeout: 120 });
```

**Configuration Options**:
- `language` - Runtime: `"python"`, `"typescript"`, or `"javascript"`
- `envVars` - Environment variables object (NOT for Claude Code auth — use filesystem)
- `autoStopInterval` - Minutes of inactivity before auto-stop (30 recommended)
- `labels` - Key-value metadata tags
- `{ timeout: 120 }` - Creation timeout in seconds

**Note**: We use non-ephemeral sandboxes because `pollSandbox` runs as a separate scheduled action and needs to reconnect via `daytona.get(sandboxId)`.

## Credential Provisioning

Claude Code auth requires filesystem credentials, NOT env vars. Use the unified credential manager:

```typescript
// convex/lib/credentials.ts
import { buildSandboxCredentials, provisionSandboxCredentials, validateCredentialsAvailable } from "./lib/credentials";

// 1. Validate credentials BEFORE creating sandbox
validateCredentialsAvailable(githubToken);

// 2. Build credentials object
const credentials = buildSandboxCredentials(githubToken);

// 3. Provision to sandbox after creation
await provisionSandboxCredentials(sandbox, credentials);
```

**What gets provisioned**:
- `~/.claude/.credentials.json` — Claude Code OAuth credentials
- `~/.claude.json` — OAuth account config
- `~/.git-credentials` — Git credential store for push auth
- Git global config — credential.helper, user.name, user.email

## Sandbox Setup Sequence

```typescript
// Clone repos using SDK (relative paths work, absolute don't)
await sandbox.git.clone(
  `https://github.com/${repoFullName}.git`,
  "project",           // Relative path from workdir
  undefined, undefined,
  "x-access-token", githubToken,  // Git auth
);
await sandbox.git.clone("https://github.com/seanchiuai/cc-template.git", "cc-template");

// Copy template files
await sandbox.process.executeCommand("cp -r cc-template/.claude project/");
await sandbox.process.executeCommand(
  "cp cc-template/template-CLAUDE.md project/ && " +
  "cp cc-template/TASKS.md project/ && " +
  "mkdir -p project/docs project/prompts && " +
  "cp cc-template/docs/PRD.md project/docs/ && " +
  "cp cc-template/docs/design.md project/docs/ && " +
  "cp cc-template/docs/development-progress.yaml project/docs/ && " +
  "cp cc-template/prompts/phase-1.md project/prompts/"
);

// Upload prompt file
await sandbox.fs.uploadFile(Buffer.from(prompt, "utf-8"), "prompt.txt");

// Configure git identity in project dir
await sandbox.process.executeCommand(
  'git config user.name "Shipright" && git config user.email "bot@shipright.dev"',
  "project"
);
```

## Launching Claude Code (Async with Polling)

Claude Code runs asynchronously via nohup + launcher script. The `-p` flag buffers output until completion.

```typescript
// Install Claude Code CLI
await sandbox.process.executeCommand("npm install -g @anthropic-ai/claude-code", undefined, undefined, 90);

// Write launcher script (avoids complex shell quoting issues)
const homeDir = "/home/daytona";
const launcherScript = `#!/bin/bash
cd ${homeDir}/project
claude -p "$(cat ${homeDir}/prompt.txt)" --model claude-sonnet-4-20250514 --permission-mode bypassPermissions > /tmp/claude_output.txt 2>&1
echo $? > /tmp/claude_exit_code
`;
await sandbox.fs.uploadFile(Buffer.from(launcherScript, "utf-8"), `${homeDir}/run_claude.sh`);
await sandbox.process.executeCommand("chmod +x ~/run_claude.sh");

// Launch as background process
await sandbox.process.executeCommand("nohup ~/run_claude.sh > /dev/null 2>&1 &");

// Save sandbox ID for polling action
await ctx.runMutation(api.projects.saveSandboxInfo, {
  projectId, sandboxId: sandbox.id, sandboxSessionId: "nohup", sandboxCommandId: "nohup",
});

// Schedule polling (start checking after 60s)
await ctx.scheduler.runAfter(60000, api.scaffolding.pollSandbox, { projectId });
```

**executeCommand() Parameters**:
- `command` - Shell command to execute
- `cwd` - Working directory (optional, relative path)
- `user` - User to run as (optional)
- `timeout` - Timeout in seconds (optional)

**executeCommand() Returns**:
```typescript
{ exitCode: number; result: string; }
```

## Polling for Completion

`pollSandbox` runs as a scheduled action every 30s to check if Claude Code finished:

```typescript
// convex/scaffolding.ts
export const pollSandbox = action({
  args: { projectId: v.id("projects"), pollCount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
    const sandbox = await daytona.get(project.sandboxId!);

    // Check for exit code file
    const checkResult = await sandbox.process.executeCommand('cat /tmp/claude_exit_code 2>/dev/null || echo "RUNNING"');
    const exitCodeStr = (checkResult.result || "").trim();

    if (exitCodeStr === "RUNNING" || exitCodeStr === "") {
      // Timeout after 40 polls (~20 min)
      if (args.pollCount >= 40) {
        throw new ExternalServiceError("anthropic", "Claude Code timed out");
      }
      // Re-schedule poll in 30s
      await ctx.scheduler.runAfter(30000, api.scaffolding.pollSandbox, {
        projectId: args.projectId,
        pollCount: (args.pollCount || 0) + 1,
      });
      return;
    }

    const exitCode = parseInt(exitCodeStr, 10);
    if (exitCode !== 0) {
      const output = await sandbox.process.executeCommand('tail -30 /tmp/claude_output.txt');
      throw new ExternalServiceError("anthropic", `Claude Code failed (exit ${exitCode})`);
    }

    // Success — commit and push with retry
    await withRetry(async () => {
      const result = await sandbox.process.executeCommand(
        'cd project && git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main',
        undefined, undefined, 60,
      );
      if (result.exitCode !== 0) throw new Error(`Git push failed: ${result.result}`);
    }, GITHUB_RETRY_CONFIG, { operation: "git_push" });

    // Cleanup sandbox
    await daytona.delete(sandbox);

    await ctx.runMutation(api.projects.updateScaffoldingStatus, {
      projectId, scaffoldingStatus: "scaffolding_complete",
    });
  },
});
```

## Lifecycle Management

```typescript
// Reconnect to existing sandbox (for polling from separate action)
const sandbox = await daytona.get(sandboxId);

// Delete sandbox permanently
await daytona.delete(sandbox);
```

**Key Pattern**: `executeSandbox` saves `sandboxId` to project, then `pollSandbox` reconnects via `daytona.get(sandboxId)`. This avoids Convex's 10-minute action timeout by splitting into scheduled actions.

## Architecture Overview

The scaffolding pipeline splits into two scheduled actions to avoid Convex's 10-minute action timeout:

```
runScaffoldingPipeline
  ├── generatePrd (Gemini)
  ├── researchTechStack (Gemini)
  └── scheduler.runAfter(0, executeSandbox)  ← schedules independent action

executeSandbox
  ├── Validate credentials
  ├── Create sandbox (non-ephemeral)
  ├── Provision credentials to filesystem
  ├── Clone repos, copy files
  ├── Install Claude Code CLI
  ├── Write launcher script + launch via nohup
  ├── Save sandboxId to project
  └── scheduler.runAfter(60000, pollSandbox)  ← schedules independent action

pollSandbox (runs every 30s)
  ├── Reconnect to sandbox via daytona.get()
  ├── Check /tmp/claude_exit_code
  ├── If RUNNING: re-schedule poll
  ├── If done: commit + push + cleanup
  └── Update scaffoldingStatus
```

**Key Infrastructure**:
- `convex/lib/credentials.ts` — Unified credential provisioning
- `convex/lib/retry.ts` — Exponential backoff for external APIs
- `convex/lib/errors.ts` — Structured error types with user messages

## Error Handling

```typescript
try {
  const sandbox = await daytona.create(params);
} catch (error: any) {
  if (error.message.includes("timeout")) {
    throw new Error("Sandbox creation timed out. Please try again.");
  } else if (error.message.includes("quota")) {
    throw new Error("Sandbox quota exceeded. Please contact support.");
  }
  throw error;
}
```

**Common Issues**:
- Sandbox timeout → Increase timeout or extend auto-stop
- Command fails → Check exit code and error output
- Git push fails → Verify token permissions
- Out of resources → Reduce concurrent sandboxes

## Environment Variables

```bash
# Convex environment
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://app.daytona.io/api

# Claude Code OAuth (NOT API key — OAuth tokens from macOS Keychain)
CLAUDE_CODE_CREDENTIALS_JSON=...  # From: security find-generic-password -s "Claude Code-credentials" -w
CLAUDE_CODE_OAUTH_ACCOUNT_JSON=... # Optional: OAuth account config
```

Set in Convex:
```bash
npx convex env set DAYTONA_API_KEY <value>
npx convex env set CLAUDE_CODE_CREDENTIALS_JSON "$(security find-generic-password -s 'Claude Code-credentials' -w)"
```

**Note**: Claude Code uses OAuth credentials stored in `~/.claude/.credentials.json`, NOT the `ANTHROPIC_API_KEY` env var. The API rejects OAuth tokens sent via that env var.

# Daytona Sandbox Reference

Complete Daytona SDK usage, sandbox lifecycle, and customization patterns for Shipright.

## Installation

```bash
npm install @daytonaio/sdk
```

## Creating a Sandbox (Convex Action)

```typescript
// convex/daytona.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Daytona } from "@daytonaio/sdk";

export const createCustomizationSandbox = action({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
    githubToken: v.string(),
  },
  handler: async (ctx, args) => {
    const daytona = new Daytona();

    // Create sandbox with TypeScript runtime
    const sandbox = await daytona.create({
      language: "typescript", // or "python", "javascript"
      name: `shipright-${args.projectId}`,
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        GITHUB_TOKEN: args.githubToken,
      },
      autoStopInterval: 30, // Stop after 30 min inactivity
      autoArchiveInterval: 1440, // Archive after 24 hours stopped
      autoDeleteInterval: 4320, // Delete after 72 hours stopped
      labels: { project: "shipright", projectId: args.projectId },
    });

    return {
      sandboxId: sandbox.id,
      state: sandbox.state,
    };
  },
});
```

**Configuration Options**:
- `language` - Runtime: `"python"`, `"typescript"`, or `"javascript"`
- `name` - Optional custom sandbox name
- `envVars` - Environment variables object
- `autoStopInterval` - Minutes of inactivity before auto-stop (0 = disabled)
- `autoArchiveInterval` - Minutes stopped before archiving
- `autoDeleteInterval` - Minutes stopped before deletion
- `labels` - Key-value metadata tags
- `resources` - Custom CPU/memory/disk allocation
- `ephemeral` - Auto-delete when stopped (boolean)

## Executing Commands

```typescript
export const runCustomization = action({
  args: {
    sandboxId: v.string(),
    repoUrl: v.string(),
    customizationPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const daytona = new Daytona();
    const sandbox = await daytona.findOne(args.sandboxId);

    // Clone repository
    const cloneResult = await sandbox.process.exec(
      `git clone ${args.repoUrl} /workspace/project`
    );

    if (cloneResult.exitCode !== 0) {
      throw new Error(`Git clone failed: ${cloneResult.result}`);
    }

    // Run Claude Code with customization
    const claudeResult = await sandbox.process.exec(
      `cd /workspace/project && claude "${args.customizationPrompt}"`,
      {
        cwd: "/workspace/project",
        timeout: 600000, // 10 minutes
      }
    );

    if (claudeResult.exitCode !== 0) {
      throw new Error(`Claude Code failed: ${claudeResult.result}`);
    }

    // Commit and push changes
    await sandbox.process.exec(
      'git config user.name "Shipright" && git config user.email "bot@shipright.dev"',
      { cwd: "/workspace/project" }
    );

    await sandbox.process.exec(
      'git add . && git commit -m "Add customizations via Shipright" && git push origin main',
      { cwd: "/workspace/project" }
    );

    return {
      output: claudeResult.result,
      summary: parseBuildSummary(claudeResult.result),
    };
  },
});
```

**exec() Parameters**:
- `command` (required) - Shell command to execute
- `cwd` - Working directory (optional)
- `timeout` - Timeout in milliseconds (optional)
- `env` - Additional environment variables (optional)

**exec() Returns**:
```typescript
{
  exitCode: number;
  result: string; // Combined stdout/stderr
}
```

## Running Code Snippets (Python)

For Python code execution without shell:

```typescript
const response = await sandbox.process.codeRun(
  `
def greet(name):
    return f"Hello, {name}!"

result = greet("Shipright")
print(result)
`,
  {
    env: { API_KEY: "secret123" },
  }
);

if (response.exitCode !== 0) {
  console.error(`Error: ${response.result}`);
} else {
  console.log(response.result); // Output: Hello, Shipright!
}
```

## Persistent Sessions

For maintaining state between commands:

```typescript
const sessionId = "build-session-1";

// Create session
await sandbox.process.createSession(sessionId);

// Execute commands in session (state persists)
await sandbox.process.executeSessionCommand(sessionId, {
  command: "export FOO=BAR",
});

const result = await sandbox.process.executeSessionCommand(sessionId, {
  command: "echo $FOO",
});

console.log(result.output); // Output: BAR
```

## Lifecycle Management

```typescript
// Stop sandbox (preserves filesystem, clears memory)
await sandbox.stop();

// Restart stopped sandbox
const sandbox = await daytona.findOne(sandboxId);
await sandbox.start();

// Archive sandbox (move to object storage)
await sandbox.stop();
await sandbox.archive();

// Update lifecycle settings
await sandbox.setAutostopInterval(0); // Disable auto-stop
await sandbox.setAutoArchiveInterval(60); // Archive after 1 hour
await sandbox.setAutoDeleteInterval(120); // Delete after 2 hours

// Delete sandbox permanently
await daytona.delete(sandbox);
```

## Customization Prompt Template

```typescript
function buildCustomizationPrompt(requirements: string[], templateInfo: any): string {
  return `You are building on top of a ${templateInfo.stack.join(", ")} template.

The template includes:
${templateInfo.capabilities.map(c => `- ${c}`).join("\n")}

Add the following features that are NOT in the template:
${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Follow the existing code patterns in the template. Commit your changes with clear messages.

IMPORTANT: When you are done, output a BUILD SUMMARY in this format:
---BUILD_SUMMARY---
Features built:
- [list each feature with brief description]

Files created:
- [list new files]

Files modified:
- [list modified files]

Patterns used:
- [list key patterns/libraries used]

Notes for scaffolding:
- [any important context for generating CLAUDE.md/TASKS.md]
---END_SUMMARY---`;
}
```

## Parsing Build Summary

```typescript
function parseBuildSummary(output: string): BuildSummary {
  const summaryMatch = output.match(
    /---BUILD_SUMMARY---([\s\S]*?)---END_SUMMARY---/
  );

  if (!summaryMatch) {
    throw new Error("No build summary found in output");
  }

  const summaryText = summaryMatch[1];

  return {
    features: extractSection(summaryText, "Features built:"),
    filesCreated: extractSection(summaryText, "Files created:"),
    filesModified: extractSection(summaryText, "Files modified:"),
    patterns: extractSection(summaryText, "Patterns used:"),
    notes: extractSection(summaryText, "Notes for scaffolding:"),
  };
}

function extractSection(text: string, sectionName: string): string[] {
  const regex = new RegExp(`${sectionName}\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i');
  const match = text.match(regex);

  if (!match) return [];

  return match[1]
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("-"))
    .map(line => line.substring(1).trim());
}

interface BuildSummary {
  features: string[];
  filesCreated: string[];
  filesModified: string[];
  patterns: string[];
  notes: string[];
}
```

## Saving Build Summary to Convex

```typescript
// After parsing summary
await ctx.runMutation(api.projects.saveBuildSummary, {
  projectId: args.projectId,
  summary: buildSummary,
});
```

This summary is critical for Phase 6 scaffolding generation - it tells us exactly what was built vs what was requested.

## Complete Example

```typescript
// convex/customization.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Daytona } from "@daytonaio/sdk";
import { api } from "./_generated/api";

export const customizeTemplate = action({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
    githubToken: v.string(),
    requirements: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const daytona = new Daytona();

    try {
      // Create ephemeral sandbox
      const sandbox = await daytona.create({
        language: "typescript",
        ephemeral: true,
        autoStopInterval: 15,
        envVars: {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          GITHUB_TOKEN: args.githubToken,
        },
      });

      // Clone and customize
      await sandbox.process.exec(`git clone ${args.repoUrl} /workspace/app`);

      const prompt = buildCustomizationPrompt(args.requirements, {});
      const result = await sandbox.process.exec(
        `cd /workspace/app && claude "${prompt}"`,
        { timeout: 600000 }
      );

      // Parse and save summary
      const summary = parseBuildSummary(result.result);
      await ctx.runMutation(api.projects.saveBuildSummary, {
        projectId: args.projectId,
        summary,
      });

      // Cleanup
      await daytona.delete(sandbox);

      return { success: true, summary };
    } catch (error: any) {
      console.error("Customization failed:", error);
      throw new Error(`Template customization failed: ${error.message}`);
    }
  },
});
```

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
# .env.local or Convex environment
DAYTONA_API_KEY=dtn_...
ANTHROPIC_API_KEY=sk-ant-...
```

Set in Convex:
```bash
npx convex env set DAYTONA_API_KEY <value>
npx convex env set ANTHROPIC_API_KEY <value>
```

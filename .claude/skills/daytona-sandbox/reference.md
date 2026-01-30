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

const daytona = new Daytona();

const sandbox = await daytona.create({
  language: "typescript",
  name: `shipright-${projectId}`,
  ephemeral: true,
  envVars: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GITHUB_TOKEN: decryptedGithubToken,
  },
  autoStopInterval: 15, // Stop after 15 min inactivity
  labels: { project: "shipright", projectId },
});
```

**Configuration Options**:
- `language` - Runtime: `"python"`, `"typescript"`, or `"javascript"`
- `name` - Optional custom sandbox name
- `envVars` - Environment variables object
- `autoStopInterval` - Minutes of inactivity before auto-stop (0 = disabled)
- `ephemeral` - Auto-delete when stopped (boolean)
- `labels` - Key-value metadata tags

## Sandbox Command Sequence

```bash
# 1. Clone user's repo
git clone https://${GITHUB_TOKEN}@github.com/${repoFullName}.git /workspace/project

# 2. Clone cc-template (public repo, no auth needed)
git clone https://github.com/seanchiuai/cc-template.git /workspace/cc-template

# 3. Copy infrastructure files (as-is, no customization)
cp -r /workspace/cc-template/.claude /workspace/project/

# 4. Copy template files (these get customized by Claude Code)
cp /workspace/cc-template/template-CLAUDE.md /workspace/project/
cp /workspace/cc-template/TASKS.md /workspace/project/
mkdir -p /workspace/project/docs /workspace/project/prompts
cp /workspace/cc-template/docs/PRD.md /workspace/project/docs/
cp /workspace/cc-template/docs/design.md /workspace/project/docs/
cp /workspace/cc-template/docs/development-progress.yaml /workspace/project/docs/
cp /workspace/cc-template/prompts/phase-1.md /workspace/project/prompts/

# 5. Write prompt file (avoids shell escaping issues)
cat > /workspace/prompt.txt << 'PROMPT_EOF'
[assembled prompt content]
PROMPT_EOF

# 6. Configure git
cd /workspace/project
git config user.name "Shipright"
git config user.email "bot@shipright.dev"

# 7. Run Claude Code with prompt file
claude --print "$(cat /workspace/prompt.txt)"

# 8. Commit and push
git add . && git commit -m "Add project scaffolding via Shipright" && git push origin main
```

## Executing Commands

```typescript
// Clone repository
const cloneResult = await sandbox.process.exec(
  `git clone https://${githubToken}@github.com/${repoFullName}.git /workspace/project`
);

if (cloneResult.exitCode !== 0) {
  throw new Error(`Git clone failed: ${cloneResult.result}`);
}

// Run Claude Code
const claudeResult = await sandbox.process.exec(
  `cd /workspace/project && claude --print "$(cat /workspace/prompt.txt)"`,
  { cwd: "/workspace/project", timeout: 600000 } // 10 minutes
);
```

**exec() Parameters**:
- `command` (required) - Shell command to execute
- `cwd` - Working directory (optional)
- `timeout` - Timeout in milliseconds (optional)

**exec() Returns**:
```typescript
{
  exitCode: number;
  result: string; // Combined stdout/stderr
}
```

## Prompt Construction

```typescript
function buildSandboxPrompt(params: {
  ccTemplateClaude: string;    // cc-template's CLAUDE.md (meta-instructions)
  prdMarkdown: string;         // Generated PRD from Step 1
  techStack: TechStackResult;  // Resolved + user-chosen integrations
  requirements: Requirements;   // Raw interview requirements
  templateName: string;
  templateStack: string[];
  templateGaps: string[];
}): string {
  return `${params.ccTemplateClaude}

---

## Project Context

### Generated PRD
${params.prdMarkdown}

### Tech Stack
Base template: ${params.templateName} (${params.templateStack.join(', ')})
Template gaps: ${params.templateGaps.join(', ')}

Resolved integrations:
${JSON.stringify(params.techStack.resolved, null, 2)}

### Raw Requirements
${JSON.stringify(params.requirements, null, 2)}

---

## Instructions

Fill in each template file ONE BY ONE in this exact order:

1. docs/PRD.md - Use the Generated PRD above. Adapt to template format.
2. docs/design.md - Create UI specs based on PRD features and user flows.
3. template-CLAUDE.md - Fill in project details, then rename to CLAUDE.md.
4. TASKS.md - Create tasks referencing user stories from PRD.
5. docs/development-progress.yaml - Define phases matching CLAUDE.md.
6. prompts/phase-N.md - One prompt per phase, referencing user stories and skills.
7. .claude/skills/ - Generate domain-specific skills for each integration.

For each file:
- Read the template first to understand the {{PLACEHOLDER}} format
- Fill in every placeholder with project-specific content
- Do NOT leave any {{PLACEHOLDER}} unfilled
- Commit each file individually with a descriptive message

After all files are complete, do a final review pass.`;
}
```

## Lifecycle Management

```typescript
// Stop sandbox
await sandbox.stop();

// Delete sandbox permanently
await daytona.delete(sandbox);

// Find existing sandbox
const sandbox = await daytona.findOne(sandboxId);
```

## Complete Example

```typescript
// convex/scaffolding.ts - executeSandbox action
export const executeSandbox = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const daytona = new Daytona();

    try {
      // 1. Fetch project data
      const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
      const user = await ctx.runQuery(api.users.getById, { userId: project.userId });
      const githubToken = decryptToken(user.githubToken);

      // 2. Fetch cc-template CLAUDE.md (meta-instructions)
      const ccTemplateClaude = await fetchCcTemplateClaude();

      // 3. Build prompt
      const prompt = buildSandboxPrompt({
        ccTemplateClaude,
        prdMarkdown: project.prdMarkdown,
        techStack: { ...project.techStackResearch, ...project.techStackChoices },
        requirements: project.requirements,
        templateName: project.templateName,
        templateStack: matchedTemplate.stack,
        templateGaps: project.matchGaps || [],
      });

      // 4. Create sandbox
      const sandbox = await daytona.create({
        language: "typescript",
        ephemeral: true,
        autoStopInterval: 15,
        envVars: {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          GITHUB_TOKEN: githubToken,
        },
      });

      // 5. Clone repos, copy files, run Claude Code (see command sequence above)
      // ...

      // 6. Cleanup
      await daytona.delete(sandbox);

      // 7. Update status
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_complete",
        status: "complete",
      });

      return { success: true };
    } catch (error: any) {
      await ctx.runMutation(api.projects.updateScaffoldingStatus, {
        projectId: args.projectId,
        scaffoldingStatus: "scaffolding_failed",
        scaffoldingError: error.message,
      });
      throw error;
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
# Convex environment
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
ANTHROPIC_API_KEY=sk-ant-...
```

Set in Convex:
```bash
npx convex env set DAYTONA_API_KEY <value>
npx convex env set ANTHROPIC_API_KEY <your-api-key>
```

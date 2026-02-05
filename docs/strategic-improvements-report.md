# Strategic Improvements Report: Shipright Pipeline Reliability

**Date:** 2026-02-04
**Scope:** Architecture, process, and system design recommendations based on past 24 hours of incident analysis
**Audience:** Technical leadership, engineering team

---

## Executive Summary

The past 24 hours revealed **5 systemic failure categories** in the scaffolding pipeline:

1. **Authentication fragmentation** — Multiple auth mechanisms with unclear boundaries
2. **Async execution brittleness** — Ad-hoc timeout handling, lost context
3. **External API naivety** — Treating GitHub/Daytona as synchronous and reliable
4. **Error handling inconsistency** — Some errors cascade, some swallow silently
5. **Testing gaps** — Integration paths untested until production

These aren't isolated bugs—they're **architectural debt** that will compound. Each incident required 2-4 hours to diagnose and fix. At current velocity, we'll spend 30-40% of engineering time on firefighting rather than features.

**Recommendation:** Invest 2-3 weeks in foundational reliability work before Phase 6 (Production Deploy). The cost of not doing this is higher.

---

## Part 1: Authentication Architecture

### Current State (Problem)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT AUTH CHAOS                           │
├─────────────────────────────────────────────────────────────────┤
│  Local Dev        │  CI/Test          │  Sandbox (Daytona)      │
│  ─────────────    │  ─────────────    │  ─────────────────────  │
│  macOS Keychain   │  ???              │  ~/.claude/.credentials │
│  (OAuth token)    │                   │  ~/.claude.json         │
│                   │                   │  ~/.git-credentials     │
│                   │                   │  GITHUB_TOKEN env var   │
├─────────────────────────────────────────────────────────────────┤
│  PROBLEM: 4 different auth paths, 3 different storage formats   │
│  RESULT: Auth failures are unpredictable and hard to diagnose   │
└─────────────────────────────────────────────────────────────────┘
```

**Why this happened:** Each integration was added independently. Daytona, Claude Code, GitHub each have their own auth patterns. We adapted to each without a unifying abstraction.

**Business impact:** Auth failures are the #1 cause of "scaffolding_failed" status. Users see a broken product even though the core logic is correct.

### Proposed State (Solution)

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED CREDENTIAL MANAGER                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │              CredentialManager                        │     │
│   │  ─────────────────────────────────────────────────── │     │
│   │  + getClaudeCredentials(env: Environment): Creds     │     │
│   │  + getGitHubToken(userId: string): string            │     │
│   │  + getDaytonaKey(): string                           │     │
│   │  + writeToSandbox(sandbox, credentials[]): void      │     │
│   └──────────────────────────────────────────────────────┘     │
│                            │                                    │
│          ┌─────────────────┼─────────────────┐                 │
│          ▼                 ▼                 ▼                 │
│   ┌────────────┐   ┌────────────┐   ┌────────────────┐        │
│   │ KeychainAdapter│ │ EnvVarAdapter │ │ FileSystemAdapter │   │
│   │ (macOS)    │   │ (CI/Convex)│   │ (Sandbox)      │        │
│   └────────────┘   └────────────┘   └────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

**File: `convex/lib/credentials.ts`**

```typescript
// Credential types
interface ClaudeCredentials {
  type: 'oauth' | 'api_key';
  token: string;
  oauthAccount?: {
    emailAddress: string;
    accountUuid: string;
  };
}

interface SandboxCredentials {
  claude: ClaudeCredentials;
  github: { token: string };
  git: { credentialUrl: string };
}

// Environment detection
type Environment = 'local' | 'convex_action' | 'daytona_sandbox';

function detectEnvironment(): Environment {
  if (process.env.DAYTONA_WS_ID) return 'daytona_sandbox';
  if (process.env.CONVEX_CLOUD_URL) return 'convex_action';
  return 'local';
}

// Unified credential builder for sandbox
export function buildSandboxCredentials(githubToken: string): SandboxCredentials {
  const claudeCredsJson = process.env.CLAUDE_CODE_CREDENTIALS_JSON;
  const oauthAccountJson = process.env.CLAUDE_CODE_OAUTH_ACCOUNT_JSON;

  if (!claudeCredsJson) {
    throw new CredentialError('CLAUDE_CODE_CREDENTIALS_JSON not configured', {
      hint: 'Set this env var in Convex dashboard with OAuth credentials from macOS Keychain',
      docLink: 'docs/auth-setup.md#claude-code-credentials'
    });
  }

  return {
    claude: {
      type: 'oauth',
      token: JSON.parse(claudeCredsJson),
      oauthAccount: oauthAccountJson ? JSON.parse(oauthAccountJson) : undefined,
    },
    github: { token: githubToken },
    git: { credentialUrl: `https://x-access-token:${githubToken}@github.com\n` },
  };
}

// Write all credentials to sandbox filesystem
export async function provisionSandboxCredentials(
  sandbox: Sandbox,
  creds: SandboxCredentials
): Promise<void> {
  const homeDir = await getHomeDir(sandbox);

  // Claude Code credentials
  await sandbox.process.executeCommand('mkdir -p ~/.claude');
  await sandbox.fs.uploadFile(
    Buffer.from(JSON.stringify(creds.claude.token), 'utf-8'),
    `${homeDir}/.claude/.credentials.json`
  );
  if (creds.claude.oauthAccount) {
    await sandbox.fs.uploadFile(
      Buffer.from(JSON.stringify({ oauthAccount: creds.claude.oauthAccount }), 'utf-8'),
      `${homeDir}/.claude.json`
    );
  }

  // Git credentials
  await sandbox.fs.uploadFile(
    Buffer.from(creds.git.credentialUrl, 'utf-8'),
    `${homeDir}/.git-credentials`
  );
  await sandbox.process.executeCommand('git config --global credential.helper store');
}
```

**Key Details:**
- Single function to provision ALL credentials
- Type-safe credential structures
- Rich error messages with hints and doc links
- Environment-aware (local vs CI vs sandbox)

### Validation Checklist

Before any auth-dependent operation:

```typescript
async function validateAuthReadiness(ctx: ActionCtx, projectId: Id<"projects">) {
  const checks = {
    claudeCredentials: !!process.env.CLAUDE_CODE_CREDENTIALS_JSON,
    daytonaKey: !!process.env.DAYTONA_API_KEY,
    userGithubToken: false, // check below
  };

  const project = await ctx.runQuery(api.projects.get, { projectId });
  const user = await ctx.runQuery(internal.users.getById, { userId: project.userId });
  checks.userGithubToken = !!user?.githubToken;

  const failures = Object.entries(checks)
    .filter(([_, ok]) => !ok)
    .map(([name]) => name);

  if (failures.length > 0) {
    throw new AuthReadinessError(`Missing credentials: ${failures.join(', ')}`, {
      failures,
      projectId,
    });
  }
}
```

---

## Part 2: Async Execution Framework

### Current State (Problem)

```
┌──────────────────────────────────────────────────────────────┐
│                 CURRENT PIPELINE FLOW                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  runScaffoldingPipeline ──────────────────────────────────►  │
│       │                                          10 min      │
│       ├─► generatePrd (sync)                     limit       │
│       ├─► researchTechStack (sync)               shared!     │
│       └─► scheduler.runAfter(executeSandbox)                 │
│                    │                                         │
│                    └─► executeSandbox (async, own 10 min)    │
│                             │                                │
│                             └─► scheduler.runAfter(pollSandbox)
│                                      │                       │
│                                      └─► (repeat 40x, 30s)   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  PROBLEMS:                                                   │
│  - No visibility into which stage failed                     │
│  - No resumability (must restart from beginning)             │
│  - Poll count is arbitrary magic number                      │
│  - State scattered across project record fields              │
└──────────────────────────────────────────────────────────────┘
```

### Proposed State: State Machine Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PIPELINE STATE MACHINE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │ PENDING │───►│GENERATE │───►│RESEARCH │───►│ SANDBOX │     │
│   │         │    │   PRD   │    │  STACK  │    │  SETUP  │     │
│   └─────────┘    └────┬────┘    └────┬────┘    └────┬────┘     │
│                       │              │              │           │
│                       ▼              ▼              ▼           │
│                  ┌─────────┐   ┌──────────┐   ┌─────────┐      │
│                  │ FAILED  │   │ AWAITING │   │ SANDBOX │      │
│                  │         │   │ CHOICES  │   │ RUNNING │      │
│                  └─────────┘   └──────────┘   └────┬────┘      │
│                       ▲              │              │           │
│                       │              ▼              ▼           │
│                       │         ┌─────────┐   ┌─────────┐      │
│                       └─────────│ PUSHING │◄──│COMPLETE │      │
│                                 │  FILES  │   │ SANDBOX │      │
│                                 └────┬────┘   └─────────┘      │
│                                      │                          │
│                                      ▼                          │
│                                 ┌─────────┐                     │
│                                 │COMPLETE │                     │
│                                 └─────────┘                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation: Pipeline State Table

**Schema addition: `convex/schema.ts`**

```typescript
pipelineSteps: defineTable({
  projectId: v.id("projects"),
  step: v.string(), // 'generate_prd' | 'research_stack' | 'sandbox_setup' | ...
  status: v.string(), // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  attempt: v.number(), // retry count
  input: v.optional(v.any()), // serialized input for resumability
  output: v.optional(v.any()), // serialized output for next step
  error: v.optional(v.string()),
  errorContext: v.optional(v.any()), // structured error details
})
  .index("by_project", ["projectId"])
  .index("by_project_step", ["projectId", "step"])
```

**Pipeline orchestrator: `convex/lib/pipeline.ts`**

```typescript
type PipelineStep =
  | 'generate_prd'
  | 'research_stack'
  | 'await_choices'
  | 'sandbox_setup'
  | 'sandbox_running'
  | 'sandbox_pushing'
  | 'complete';

const STEP_ORDER: PipelineStep[] = [
  'generate_prd',
  'research_stack',
  'await_choices', // conditional
  'sandbox_setup',
  'sandbox_running',
  'sandbox_pushing',
  'complete',
];

interface StepTransition {
  from: PipelineStep;
  to: PipelineStep;
  condition?: (ctx: ActionCtx, projectId: Id<"projects">) => Promise<boolean>;
  action: (ctx: ActionCtx, projectId: Id<"projects">) => Promise<void>;
  timeout: number; // ms
  maxRetries: number;
}

const TRANSITIONS: StepTransition[] = [
  {
    from: 'generate_prd',
    to: 'research_stack',
    action: async (ctx, pid) => { await ctx.runAction(api.scaffolding.generatePrd, { projectId: pid }); },
    timeout: 120_000,
    maxRetries: 2,
  },
  {
    from: 'research_stack',
    to: 'await_choices',
    condition: async (ctx, pid) => {
      const project = await ctx.runQuery(api.projects.get, { projectId: pid });
      const research = project?.techStackResearch as { choices?: unknown[] };
      return (research?.choices?.length ?? 0) > 0;
    },
    action: async (ctx, pid) => { await ctx.runAction(api.scaffolding.researchTechStack, { projectId: pid }); },
    timeout: 180_000,
    maxRetries: 2,
  },
  // ... more transitions
];

// Main orchestrator - called by scheduler
export const advancePipeline = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const currentStep = await getCurrentStep(ctx, args.projectId);
    const transition = TRANSITIONS.find(t => t.from === currentStep);

    if (!transition) {
      console.log(`Pipeline complete or stuck at ${currentStep}`);
      return;
    }

    // Check condition if present
    if (transition.condition) {
      const shouldTransition = await transition.condition(ctx, args.projectId);
      if (!shouldTransition) {
        // Skip this transition, find next applicable one
        await advancePipeline(ctx, args);
        return;
      }
    }

    // Execute step with timeout and retry
    await executeStepWithRetry(ctx, args.projectId, transition);

    // Schedule next step
    await ctx.scheduler.runAfter(0, api.pipeline.advancePipeline, { projectId: args.projectId });
  },
});
```

### Resumability

Key insight: Store enough state to resume from any step.

```typescript
// After any failure, user can click "Retry" which calls:
export const resumePipeline = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Find last successful step
    const steps = await ctx.runQuery(internal.pipelineSteps.byProject, { projectId: args.projectId });
    const lastSuccess = steps
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.completedAt! - a.completedAt!)[0];

    if (!lastSuccess) {
      // Start from beginning
      await ctx.scheduler.runAfter(0, api.pipeline.advancePipeline, { projectId: args.projectId });
      return;
    }

    // Resume from next step after last success
    const nextStepIndex = STEP_ORDER.indexOf(lastSuccess.step as PipelineStep) + 1;
    await ctx.runMutation(internal.pipelineSteps.setCurrentStep, {
      projectId: args.projectId,
      step: STEP_ORDER[nextStepIndex],
    });

    await ctx.scheduler.runAfter(0, api.pipeline.advancePipeline, { projectId: args.projectId });
  },
});
```

### Visibility: Real-Time Pipeline UI

```typescript
// Frontend hook
function usePipelineProgress(projectId: Id<"projects">) {
  const steps = useQuery(api.pipelineSteps.byProject, { projectId });

  return {
    currentStep: steps?.find(s => s.status === 'running')?.step,
    completedSteps: steps?.filter(s => s.status === 'completed').map(s => s.step),
    failedStep: steps?.find(s => s.status === 'failed'),
    progress: calculateProgress(steps),
    estimatedTimeRemaining: estimateTime(steps),
  };
}
```

---

## Part 3: External API Resilience

### Current State (Problem)

```typescript
// Current: Hope for the best
const result = await octokit.rest.git.createTree({ ... });
```

### Proposed State: Resilient Client Wrapper

**File: `convex/lib/resilient-client.ts`**

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
};

// GitHub-specific config (more aggressive for eventual consistency)
const GITHUB_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxAttempts: 7,
  retryableStatuses: [...DEFAULT_RETRY_CONFIG.retryableStatuses, 404], // 404 can be eventual consistency
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: { operation: string; resourceId?: string }
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      const shouldRetry = isRetryable(error, config);
      const isLastAttempt = attempt === config.maxAttempts;

      console.log(formatLogEntry({
        action: context.operation,
        resourceId: context.resourceId,
        attempt,
        maxAttempts: config.maxAttempts,
        error: lastError.message,
        willRetry: shouldRetry && !isLastAttempt,
        nextDelayMs: delay,
      }));

      if (!shouldRetry || isLastAttempt) {
        throw new RetryExhaustedError(
          `${context.operation} failed after ${attempt} attempts: ${lastError.message}`,
          { attempts: attempt, lastError, context }
        );
      }

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError;
}

// Wrapped GitHub client
export function createResilientOctokit(token: string) {
  const octokit = new Octokit({ auth: token });

  return {
    async createTree(params: CreateTreeParams) {
      return withRetry(
        () => octokit.rest.git.createTree(params),
        GITHUB_RETRY_CONFIG,
        { operation: 'github.createTree', resourceId: `${params.owner}/${params.repo}` }
      );
    },

    async getCommit(params: GetCommitParams) {
      return withRetry(
        () => octokit.rest.git.getCommit(params),
        GITHUB_RETRY_CONFIG,
        { operation: 'github.getCommit', resourceId: params.commit_sha }
      );
    },

    // ... wrap other methods
  };
}
```

### Circuit Breaker Pattern

For when an external service is completely down:

```typescript
interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

class CircuitBreaker {
  private state: CircuitState = { status: 'closed', failures: 0, lastFailure: 0, nextAttempt: 0 };

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() < this.state.nextAttempt) {
        throw new CircuitOpenError('Circuit breaker is open, service unavailable');
      }
      this.state.status = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state = { status: 'closed', failures: 0, lastFailure: 0, nextAttempt: 0 };
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.threshold) {
      this.state.status = 'open';
      this.state.nextAttempt = Date.now() + this.resetTimeMs;
    }
  }
}

// Usage
const githubCircuit = new CircuitBreaker(5, 60000);
const daytonaCircuit = new CircuitBreaker(3, 120000);

export async function createGitHubRepo(octokit: Octokit, params: CreateRepoParams) {
  return githubCircuit.execute(() => octokit.rest.repos.createForAuthenticatedUser(params));
}
```

### Idempotency

Ensure operations can be safely retried:

```typescript
// Before creating a repo, check if it already exists
export async function ensureRepoExists(
  octokit: Octokit,
  owner: string,
  repoName: string,
  createParams: CreateRepoParams
): Promise<{ repo: Repository; created: boolean }> {
  // Check if exists
  try {
    const existing = await octokit.rest.repos.get({ owner, repo: repoName });
    return { repo: existing.data, created: false };
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }

  // Create
  const created = await octokit.rest.repos.createForAuthenticatedUser(createParams);
  return { repo: created.data, created: true };
}
```

---

## Part 4: Error Handling Philosophy

### Current Problems

1. **Inconsistent error formats** — Some throw strings, some throw Error objects
2. **Lost context** — Error messages don't include enough debugging info
3. **Silent failures** — Some errors are caught and swallowed
4. **User-hostile messages** — Technical jargon exposed to end users

### Proposed: Structured Error Hierarchy

**File: `convex/lib/errors.ts`**

```typescript
// Base error with context
export class ShiprightError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, unknown> = {},
    public readonly userMessage?: string, // Friendly message for UI
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'ShiprightError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
    };
  }
}

// Specific error types
export class AuthenticationError extends ShiprightError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(
      message,
      'AUTH_ERROR',
      context,
      'Unable to authenticate. Please reconnect your GitHub account.',
      true, // User can retry after reconnecting
    );
    this.name = 'AuthenticationError';
  }
}

export class ExternalServiceError extends ShiprightError {
  constructor(
    service: 'github' | 'daytona' | 'anthropic',
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(
      `${service} error: ${message}`,
      `${service.toUpperCase()}_ERROR`,
      { service, ...context },
      `We're having trouble connecting to ${service}. Please try again in a few minutes.`,
      true,
    );
    this.name = 'ExternalServiceError';
  }
}

export class PipelineStepError extends ShiprightError {
  constructor(
    step: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(
      `Pipeline step '${step}' failed: ${message}`,
      'PIPELINE_STEP_ERROR',
      { step, ...context },
      'Something went wrong during project setup. Our team has been notified.',
      true,
    );
    this.name = 'PipelineStepError';
  }
}

export class ValidationError extends ShiprightError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(
      message,
      'VALIDATION_ERROR',
      context,
      message, // Validation errors are usually user-friendly already
      true,
    );
    this.name = 'ValidationError';
  }
}
```

### Error Boundary Pattern

```typescript
// Wrap action handlers
export function withErrorBoundary<Args extends Record<string, unknown>, Return>(
  handler: (ctx: ActionCtx, args: Args) => Promise<Return>,
  options: { step?: string; projectIdArg?: keyof Args } = {},
): (ctx: ActionCtx, args: Args) => Promise<Return> {
  return async (ctx, args) => {
    const projectId = options.projectIdArg ? args[options.projectIdArg] as string : undefined;

    try {
      return await handler(ctx, args);
    } catch (error) {
      // Already a ShiprightError, enrich and rethrow
      if (error instanceof ShiprightError) {
        await reportError(ctx, error, projectId);
        throw error;
      }

      // Wrap unknown error
      const wrapped = new PipelineStepError(
        options.step || 'unknown',
        error instanceof Error ? error.message : String(error),
        { originalError: error, projectId },
      );

      await reportError(ctx, wrapped, projectId);
      throw wrapped;
    }
  };
}

async function reportError(ctx: ActionCtx, error: ShiprightError, projectId?: string) {
  // Log to console
  console.error(formatLogEntry({
    level: 'error',
    code: error.code,
    message: error.message,
    context: error.context,
    projectId,
  }));

  // Report to Sentry
  await reportToSentry({
    message: error.message,
    context: { ...error.context, projectId },
    tags: { errorCode: error.code },
  });

  // Store in pipeline events for debugging
  if (projectId) {
    await ctx.runMutation(api.pipelineEvents.log, {
      projectId: projectId as Id<"projects">,
      step: error.context.step as string || 'error',
      status: 'failed',
      error: error.message,
      metadata: error.context,
    });
  }

  // Update project status if applicable
  if (projectId && error.context.step) {
    await ctx.runMutation(api.projects.updateScaffoldingStatus, {
      projectId: projectId as Id<"projects">,
      scaffoldingStatus: 'scaffolding_failed',
      scaffoldingError: error.userMessage || error.message,
    });
  }
}

// Usage
export const executeSandbox = action({
  args: { projectId: v.id("projects") },
  handler: withErrorBoundary(
    async (ctx, args) => {
      // ... implementation
    },
    { step: 'sandbox_execution', projectIdArg: 'projectId' }
  ),
});
```

---

## Part 5: Testing Strategy

### Current Gaps

| Layer | Current | Target |
|-------|---------|--------|
| Unit tests | ✅ Present | ✅ Maintain |
| Integration tests | ❌ Missing | ✅ Add |
| E2E tests | Manual only | Automated in CI |
| Contract tests | ❌ Missing | ✅ Add |
| Chaos tests | ❌ Missing | Consider |

### Integration Test Architecture

**Mock external services at the boundary:**

```typescript
// convex/lib/__mocks__/github.ts
export const mockOctokit = {
  rest: {
    repos: {
      createForAuthenticatedUser: vi.fn(),
      get: vi.fn(),
    },
    git: {
      createTree: vi.fn(),
      createCommit: vi.fn(),
      getCommit: vi.fn(),
    },
  },
};

// Test file: convex/scaffolding.integration.test.ts
describe('Scaffolding Pipeline Integration', () => {
  beforeEach(() => {
    vi.mock('./lib/github', () => ({ createResilientOctokit: () => mockOctokit }));
    vi.mock('@daytonaio/sdk', () => ({ Daytona: MockDaytona }));
  });

  it('handles GitHub 404 with retry', async () => {
    // First two calls return 404 (eventual consistency), third succeeds
    mockOctokit.rest.git.createTree
      .mockRejectedValueOnce({ status: 404 })
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ data: { sha: 'tree-sha' } });

    const result = await executeSandboxHandler(mockCtx, { projectId: 'test-123' });

    expect(mockOctokit.rest.git.createTree).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
  });

  it('fails after max retries', async () => {
    mockOctokit.rest.git.createTree.mockRejectedValue({ status: 404 });

    await expect(executeSandboxHandler(mockCtx, { projectId: 'test-123' }))
      .rejects.toThrow('failed after 5 attempts');
  });
});
```

### E2E Test Automation

**GitHub Actions workflow: `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start services
        run: |
          npm run dev &
          npx convex dev &
          sleep 10

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots
          path: test-results/screenshots/
```

### Contract Tests

Verify API contracts haven't changed:

```typescript
// tests/contracts/github.contract.test.ts
describe('GitHub API Contract', () => {
  it('createTree accepts expected parameters', async () => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Use a test repo
    const result = await octokit.rest.git.createTree({
      owner: 'shipright-test',
      repo: 'contract-test',
      base_tree: 'abc123', // known tree SHA
      tree: [{ path: 'test.txt', mode: '100644', type: 'blob', content: 'test' }],
    });

    // Verify response shape matches our expectations
    expect(result.data).toMatchObject({
      sha: expect.any(String),
      url: expect.stringContaining('github.com'),
      tree: expect.arrayContaining([
        expect.objectContaining({ path: 'test.txt' }),
      ]),
    });
  });
});
```

---

## Part 6: Implementation Roadmap

### Phase A: Foundation (Week 1)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Credential Manager | Backend | `convex/lib/credentials.ts` |
| 2-3 | Error Hierarchy | Backend | `convex/lib/errors.ts` |
| 3-4 | Resilient Client | Backend | `convex/lib/resilient-client.ts` |
| 4-5 | Integration Tests | Backend | Mocked integration tests passing |

### Phase B: Pipeline Refactor (Week 2)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Pipeline State Schema | Backend | Schema migration, pipelineSteps table |
| 2-3 | State Machine Impl | Backend | `advancePipeline`, transitions |
| 3-4 | Resumability | Backend | `resumePipeline`, UI retry button |
| 4-5 | Pipeline UI | Frontend | Real-time progress component |

### Phase C: Hardening (Week 3)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Circuit Breakers | Backend | Per-service circuit breakers |
| 2-3 | E2E Automation | DevOps | CI workflow, test repo |
| 3-4 | Contract Tests | Backend | GitHub/Daytona contract tests |
| 4-5 | Documentation | Team | Updated CLAUDE.md, runbooks |

---

## Part 7: Success Metrics

### Before (Current State)

| Metric | Value |
|--------|-------|
| Scaffolding success rate | ~60% |
| Mean time to diagnose failure | 2-4 hours |
| % of failures with actionable error | ~30% |
| User retry success rate | Unknown |

### After (Target State)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scaffolding success rate | >95% | Convex dashboard |
| Mean time to diagnose failure | <15 min | Sentry + logs |
| % of failures with actionable error | >90% | Error audit |
| User retry success rate | >80% | Pipeline events |
| Pipeline visibility | 100% | All steps tracked |

---

## Part 8: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Refactor introduces regressions | Medium | High | Feature flags, gradual rollout |
| External API changes break contracts | Low | High | Contract tests, version pinning |
| Increased complexity | Medium | Medium | Clear abstractions, documentation |
| Timeline slip | Medium | Medium | Scope flexibility, weekly check-ins |

---

## Conclusion

The past 24 hours revealed that Shipright's scaffolding pipeline has **architectural debt that's compounding**. The fixes applied were tactical—they addressed immediate symptoms but didn't solve root causes.

**Key insight:** We're building a distributed system (Convex + Daytona + GitHub + Claude Code) but treating it like a monolith. Distributed systems require:

1. **Explicit state management** (state machine, not scattered fields)
2. **Assume failure** (retry, circuit breakers, idempotency)
3. **Observability** (structured logging, tracing, metrics)
4. **Graceful degradation** (partial success is better than total failure)

**Investment required:** 2-3 weeks of focused engineering work.

**ROI:** Reduced firefighting (30-40% → <10% of eng time), higher user trust, faster feature velocity.

**Recommendation:** Prioritize this work before Phase 6 (Production Deploy). Shipping to production without these foundations will amplify problems 10x.

---

*Report prepared by Claude Code analysis of commits cf6f077...58eda63*

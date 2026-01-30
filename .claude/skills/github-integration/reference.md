# GitHub Integration Reference

OAuth flow, API usage, and security patterns for GitHub integration in Shipright.

## Installation

```bash
npm install octokit
```

## OAuth Flow

### 1. Redirect to GitHub Authorization

```typescript
// src/app/api/github/connect/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard";
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${appUrl}/api/auth/github/callback`;
  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url");

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo user:email");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
```

### 2. Handle Callback

```typescript
// src/app/api/auth/github/callback/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=no_code`);
  }

  let returnTo = "/dashboard";
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      if (parsed.returnTo?.startsWith("/")) returnTo = parsed.returnTo;
    } catch { /* malformed state */ }
  }

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=not_authenticated`);
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  await convex.action(api.github.exchangeGitHubCode, { code });

  return NextResponse.redirect(`${appUrl}${returnTo}`);
}
```

### 3. Exchange Code for Access Token (Convex Action)

```typescript
// convex/github.ts ("use node" directive required)
export const exchangeGitHubCode = action({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: args.code,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description}`);

    const encryptedToken = encryptToken(data.access_token);
    await ctx.runMutation(api.users.saveGitHubToken, { encryptedToken });
    return { success: true };
  },
});
```

**Key**: Uses JWT auth (`ctx.auth.getUserIdentity()`) - no userId arg needed.

## Token Encryption

```typescript
// lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encryptToken(token: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

**Generate Encryption Key**:
```bash
openssl rand -hex 32
```

## Template Cloning

Fetches all files from a template repo and commits to a new private repo.

```typescript
// convex/github.ts

/** Parse a template sourceUrl into owner, repo, ref, and subpath */
function parseTemplateUrl(sourceUrl: string): {
  owner: string;
  repo: string;
  ref?: string;
  subpath: string;
} {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];

  if (parts[2] === "tree" && parts.length >= 4) {
    const ref = parts[3];
    const subpath = parts.slice(4).join("/");
    return { owner, repo, ref, subpath };
  }

  return { owner, repo, subpath: "" };
}

export const cloneTemplate = action({
  args: {
    projectId: v.id("projects"),
    templateSourceUrl: v.string(),
    newRepoName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) throw new Error("GitHub not connected");

    const accessToken = decryptToken(user.githubToken);
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, ref, subpath } = parseTemplateUrl(args.templateSourceUrl);

    let files: Array<{ path: string; content: string; isBinary: boolean }>;
    try {
      files = await fetchRepoFiles(octokit, owner, repo, subpath, ref);
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new Error("TEMPLATE_UNAVAILABLE");
      }
      throw error;
    }

    if (files.length === 0) {
      throw new Error("TEMPLATE_UNAVAILABLE");
    }

    // Strip subpath prefix from file paths so they're relative to repo root
    if (subpath) {
      const prefix = subpath + "/";
      files = files.map((f) => ({
        ...f,
        path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path,
      }));
    }

    let newRepo;
    try {
      const result = await octokit.rest.repos.createForAuthenticatedUser({
        name: args.newRepoName, private: true, auto_init: true,
      });
      newRepo = result.data;
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 422) {
        const suffix = Date.now().toString(36).slice(-4);
        const result = await octokit.rest.repos.createForAuthenticatedUser({
          name: `${args.newRepoName}-${suffix}`, private: true, auto_init: true,
        });
        newRepo = result.data;
      } else { throw error; }
    }

    await commitFiles(octokit, newRepo.owner.login, newRepo.name, files,
      `Initial commit from Shipright template: ${repo}`);

    await ctx.runMutation(api.projects.updateGitHubRepo, {
      projectId: args.projectId,
      repoUrl: newRepo.html_url,
      repoFullName: newRepo.full_name,
    });

    return { repoUrl: newRepo.html_url, repoFullName: newRepo.full_name };
  },
});
```

### Helper: Fetch Repo Files Recursively

```typescript
async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<Array<{ path: string; content: string; isBinary: boolean }>> {
  const { data: contents } = await octokit.rest.repos.getContent({
    owner, repo, path,
    ...(ref ? { ref } : {}),
  });

  const files: Array<{ path: string; content: string; isBinary: boolean }> = [];
  const items = Array.isArray(contents) ? contents : [contents];

  for (const item of items) {
    if (item.type === "file" && item.download_url) {
      try {
        const response = await fetch(item.download_url);
        if (!response.ok) continue; // skip files that fail to download

        const isBinary = isBinaryFile(item.name, item.size ?? 0);

        if (isBinary) {
          const buffer = await response.arrayBuffer();
          files.push({
            path: item.path,
            content: Buffer.from(buffer).toString("base64"),
            isBinary: true,
          });
        } else {
          const content = await response.text();
          files.push({ path: item.path, content, isBinary: false });
        }
      } catch {
        continue; // skip files that fail to download
      }
    } else if (item.type === "dir") {
      const subFiles = await fetchRepoFiles(octokit, owner, repo, item.path, ref);
      files.push(...subFiles);
    }
  }

  return files;
}

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg", ".bmp", ".tiff",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm",
  ".wasm", ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

function isBinaryFile(filename: string, size: number): boolean {
  if (size > 1024 * 1024) return true; // >1MB treat as binary
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}
```

### Helper: Wait for auto_init Commit

```typescript
/** Wait for auto_init commit to be available, with retries */
async function waitForRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  refName: string,
  maxRetries = 5
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner, repo, ref: refName,
      });
      return ref.object.sha;
    } catch (error: unknown) {
      if (i === maxRetries - 1) throw error;
      // Wait with exponential backoff: 500ms, 1s, 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to get ref after retries");
}
```

### Helper: Create Blobs in Batches

```typescript
/** Create blobs in batches to avoid overwhelming the API */
async function createBlobsBatched(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>,
  batchSize = 10
): Promise<Array<{ path: string; sha: string }>> {
  const results: Array<{ path: string; sha: string }> = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const content = file.isBinary
          ? file.content // already base64
          : Buffer.from(file.content).toString("base64");

        const { data: blob } = await octokit.rest.git.createBlob({
          owner, repo, content, encoding: "base64",
        });
        return { path: file.path, sha: blob.sha };
      })
    );
    results.push(...batchResults);
  }

  return results;
}
```

### Helper: Commit Files via Git Tree API

```typescript
async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>,
  message: string
) {
  const parentSha = await waitForRef(octokit, owner, repo, "heads/main");

  const blobs = await createBlobsBatched(octokit, owner, repo, files);

  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo,
    tree: blobs.map((blob) => ({
      path: blob.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha,
    })),
  });

  const { data: commit } = await octokit.rest.git.createCommit({
    owner, repo, message, tree: tree.sha, parents: [parentSha],
  });

  await octokit.rest.git.updateRef({
    owner, repo, ref: "heads/main", sha: commit.sha,
  });
}
```

## Validate GitHub Token

Check if stored token is still valid:

```typescript
// convex/github.ts
export const validateToken = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.current, {});
    if (!user?.githubToken) return { valid: false, reason: "no_token" };

    try {
      const accessToken = decryptToken(user.githubToken);
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();
      return { valid: true, username: data.login };
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        return { valid: false, reason: "expired" };
      }
      throw error;
    }
  },
});
```

## Batch Commits (Phase 5/6)

For committing files to an existing repo (scaffolding, customizations):

```typescript
// Pattern for Phase 5/6 - commit to existing repo with base_tree
async function commitToExistingRepo(
  octokit: Octokit, owner: string, repo: string,
  files: Array<{ path: string; content: string; isBinary: boolean }>, message: string
) {
  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: "heads/main" });
  const currentCommitSha = ref.object.sha;

  const blobs = await createBlobsBatched(octokit, owner, repo, files);

  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo, base_tree: currentCommitSha,
    tree: blobs.map((b) => ({
      path: b.path, mode: "100644" as const, type: "blob" as const, sha: b.sha,
    })),
  });

  const { data: commit } = await octokit.rest.git.createCommit({
    owner, repo, message, tree: tree.sha, parents: [currentCommitSha],
  });

  await octokit.rest.git.updateRef({ owner, repo, ref: "heads/main", sha: commit.sha });
  return { commitSha: commit.sha };
}
```

## Error Handling

```typescript
try {
  await octokit.rest.repos.createForAuthenticatedUser({ name });
} catch (error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 401) {
    throw new Error("GitHub connection expired. Please reconnect.");
  } else if (status === 422) {
    throw new Error("Repository name already exists.");
  } else if (status === 403) {
    throw new Error("Rate limited or insufficient permissions.");
  }
  throw error;
}
```

| Error | Status | Action |
|-------|--------|--------|
| Token expired | 401 | Redirect to /connect-github |
| Repo name taken | 422 | Auto-suffix with timestamp |
| Rate limited | 403 | Show wait time |
| Template not found | 404 | Throw TEMPLATE_UNAVAILABLE, client re-matches |

## Convex Mutations

```typescript
// convex/users.ts
export const saveGitHubToken = mutation({
  args: { encryptedToken: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject)).first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { githubToken: args.encryptedToken });
  },
});

export const removeGitHubToken = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject)).first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { githubToken: undefined });
  },
});

// convex/projects.ts
export const updateGitHubRepo = mutation({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.string(),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      githubRepoUrl: args.repoUrl,
      githubRepoFullName: args.repoFullName,
      status: "building",
    });
  },
});
```

## Environment Variables

```bash
# .env.local (Next.js)
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex env (set via npx convex env set)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ENCRYPTION_KEY=hex_encoded_32_byte_key
```

**Note**: `ENCRYPTION_KEY` and GitHub secrets must be set in both Next.js `.env.local` and Convex environment since `convex/github.ts` runs in Convex Node.js runtime.

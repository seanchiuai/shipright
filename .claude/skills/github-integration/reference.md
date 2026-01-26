# GitHub Integration Reference

Complete OAuth flow, API usage, and security patterns for GitHub integration in Shipright.

## Installation

```bash
npm install octokit
```

## Complete OAuth Flow

### 1. Redirect to GitHub Authorization

```typescript
// app/api/github/connect/route.ts
export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo user:email`;

  return Response.redirect(authUrl);
}
```

**Parameters**:
- `client_id` - Your GitHub OAuth App client ID
- `redirect_uri` - Your callback URL (must match OAuth App settings)
- `scope` - Space-separated scopes: `repo user:email`

### 2. Handle Callback with Authorization Code

```typescript
// app/api/auth/github/callback/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.json({ error: "No code provided" }, { status: 400 });
  }

  // Exchange code for token (call Convex action)
  const accessToken = await exchangeCode(code);

  // Redirect to dashboard
  return Response.redirect("/dashboard");
}
```

**Important**: Authorization code expires after 10 minutes.

### 3. Exchange Code for Access Token (Convex Action)

```typescript
// convex/github.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const exchangeGitHubCode = action({
  args: { code: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: args.code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description}`);
    }

    // Encrypt and store token
    const encryptedToken = encryptToken(data.access_token);
    await ctx.runMutation(api.users.saveGitHubToken, {
      userId: args.userId,
      token: encryptedToken,
    });

    return { success: true };
  },
});
```

**Response Format**:
```json
{
  "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
  "scope": "repo,user:email",
  "token_type": "bearer"
}
```

## Token Encryption

```typescript
// lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function encryptToken(token: string): string {
  const algorithm = "aes-256-gcm";
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const algorithm = "aes-256-gcm";
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");

  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

**Generate Encryption Key**:
```bash
# Generate 32-byte key
openssl rand -hex 32
```

Add to `.env.local`:
```bash
ENCRYPTION_KEY=your_hex_encoded_key_here
```

## Repository Creation with Octokit

```typescript
// convex/github.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Octokit } from "octokit";
import { api } from "./_generated/api";

export const createRepository = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    userId: v.id("users"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Get user's encrypted token
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    const accessToken = decryptToken(user.githubToken);

    // Initialize Octokit
    const octokit = new Octokit({ auth: accessToken });

    try {
      // Create repository
      const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name: args.name,
        description: args.description || "",
        private: args.isPrivate,
        auto_init: true, // Initialize with README
        has_issues: true,
        has_projects: false,
        has_wiki: false,
      });

      // Save repo URL to project
      await ctx.runMutation(api.projects.updateGitHubRepo, {
        projectId: args.projectId,
        repoUrl: data.html_url,
        repoFullName: data.full_name,
      });

      return {
        url: data.html_url,
        cloneUrl: data.clone_url,
        fullName: data.full_name,
      };
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error("Repository name already exists");
      }
      throw error;
    }
  },
});
```

**Common Parameters**:
- `name` (required) - Repository name
- `description` - Short description
- `private` - `true` for private, `false` for public
- `auto_init` - Initialize with README
- `has_issues` - Enable issues
- `has_projects` - Enable projects
- `has_wiki` - Enable wiki

## Committing Files with Contents API

```typescript
export const commitFile = action({
  args: {
    repoFullName: v.string(), // "owner/repo"
    filePath: v.string(),
    content: v.string(),
    message: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    const accessToken = decryptToken(user.githubToken);

    const octokit = new Octokit({ auth: accessToken });
    const [owner, repo] = args.repoFullName.split("/");

    // Base64 encode content
    const contentEncoded = Buffer.from(args.content).toString("base64");

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: args.filePath,
      message: args.message,
      content: contentEncoded,
      branch: "main",
    });
  },
});
```

## Batch Commits

For committing multiple files at once (scaffolding generation):

```typescript
export const commitScaffolding = action({
  args: {
    repoFullName: v.string(),
    files: v.array(v.object({
      path: v.string(),
      content: v.string(),
    })),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    const accessToken = decryptToken(user.githubToken);
    const octokit = new Octokit({ auth: accessToken });
    const [owner, repo] = args.repoFullName.split("/");

    // Get current commit SHA
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    });
    const currentCommitSha = ref.object.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      args.files.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return { path: file.path, sha: blob.sha };
      })
    );

    // Create tree
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: currentCommitSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      })),
    });

    // Create commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: "Add Shipright scaffolding files",
      tree: tree.sha,
      parents: [currentCommitSha],
    });

    // Update ref
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: commit.sha,
    });

    return { commitSha: commit.sha };
  },
});
```

## Error Handling

```typescript
try {
  await octokit.rest.repos.createForAuthenticatedUser({ name });
} catch (error: any) {
  if (error.status === 401) {
    // Token expired - prompt re-auth
    throw new Error("GitHub connection expired. Please reconnect.");
  } else if (error.status === 422) {
    // Name taken
    throw new Error("Repository name already exists. Try another name.");
  } else if (error.status === 403 && error.response.headers["x-ratelimit-remaining"] === "0") {
    // Rate limited
    const resetTime = error.response.headers["x-ratelimit-reset"];
    throw new Error(`Rate limited. Try again after ${new Date(resetTime * 1000)}.`);
  }
  throw error;
}
```

**Common Errors**:

| Error | Status | Solution |
|-------|--------|----------|
| Token expired | 401 | Prompt user to reconnect GitHub |
| Repo name taken | 422 | Suggest alternative names |
| Rate limited | 403 | Show wait time, implement backoff |
| Insufficient permissions | 403 | Request correct scopes |
| Not found | 404 | Verify repo exists and user has access |

## Rate Limits

- **OAuth apps**: 5,000 requests/hour per authenticated user
- **Token creation**: 10 tokens per user/app/scope, 10 tokens/hour max

Check rate limit status:
```typescript
const { data: rateLimit } = await octokit.rest.rateLimit.get();
console.log(`Remaining: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
```

## Environment Variables

```bash
# .env.local
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
ENCRYPTION_KEY=hex_encoded_32_byte_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production (.env.production or Vercel)
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
ENCRYPTION_KEY=hex_encoded_32_byte_key
NEXT_PUBLIC_APP_URL=https://shipright.vercel.app
```

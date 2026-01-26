---
name: github-integration
description: GitHub OAuth, repository creation, and committing files
---

# GitHub Integration

Handles GitHub OAuth connection and repository operations.

## Where It's Used in Shipright

- **Phase 4**: Connect GitHub account via OAuth
- **Phase 4**: Create repository from template
- **Phase 5**: Daytona pushes customizations to repo
- **Phase 6**: Commit scaffolding files (CLAUDE.md, TASKS.md, etc.)

## OAuth Flow Overview

1. User clicks "Connect GitHub"
2. Redirect to GitHub authorization page
3. GitHub redirects back with authorization code
4. Exchange code for access token
5. Store encrypted token in Convex

**Required Scopes**: `repo`, `user:email`

## Repository Creation

Timing: **Phase 4** - After template matching, before customization.

Using Octokit.js TypeScript client:

```typescript
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: accessToken });

const { data } = await octokit.rest.repos.createForAuthenticatedUser({
  name: "my-app",
  private: false,
  auto_init: true,
});
```

## Security Rules

**Always**:
- Encrypt tokens before storing in Convex
- Use Convex actions (server-side) for all GitHub API calls
- Validate tokens before operations

**Never**:
- Store tokens in plain text
- Expose tokens in client-side code
- Log tokens or include in error messages

## Reference Files

- [reference.md](reference.md) - Complete OAuth flow, API examples, encryption patterns

## External Documentation

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
- [Octokit.js](https://github.com/octokit/octokit.js)
- Use Context7 MCP to fetch current GitHub API docs

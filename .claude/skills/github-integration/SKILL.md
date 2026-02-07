---
name: github-integration
description: GitHub OAuth, repository creation, and committing files
---

# GitHub Integration

Handles GitHub OAuth connection and repository operations.

## Where It's Used in Shipright

- **Phase 4**: Connect GitHub account via OAuth, create repo from template
- **Phase 5**: Daytona sandbox pushes scaffolding files to repo (cc-template injection + Claude Code fills placeholders)

## OAuth Configuration

### Scopes Required

| Scope | Why |
|-------|-----|
| `repo` | Create private repos, push commits |
| `user:email` | Get user's email for identification |

**Why `repo` not `public_repo`?** Repos are private by default. The `repo` scope grants full access to public AND private repositories. The `public_repo` scope only works for public repos.

### OAuth Flow

1. User clicks "Connect GitHub"
2. Redirect to GitHub authorization page with scopes
3. User authorizes on GitHub
4. GitHub redirects back with authorization code
5. Exchange code for access token (server-side)
6. Encrypt and store token in Convex

## Template Cloning Mechanism

Templates are public GitHub repos. Cloning process:

1. **Fetch template files** via GitHub API (get repo contents)
2. **Create new repo** under user's account (private, auto-named from app name)
3. **Commit template files** to new repo
4. **Return repo URL** for next phases

### Why not "Create from Template" API?

GitHub's "use this template" feature requires templates to be marked as template repos. Our curated templates are regular public repos, so we fetch and commit files manually.

### Template Unavailable Handling

If template repo is deleted/private/unavailable:
1. `cloneTemplate` throws `TEMPLATE_UNAVAILABLE` error
2. Client shows friendly error: "Template unavailable. Please start over with a different idea."
3. User can click "Start Over" to reset interview and try again
4. For non-unavailable errors (e.g. Git API failures), a "Retry" button is also shown

## Repository Settings

| Setting | Value | Reason |
|---------|-------|--------|
| Private | `true` | Default for user privacy |
| Name | Auto-generated | From app name, user can rename later on GitHub |
| Auto-init | `true` | Creates initial commit so Git Data API works |

**No user confirmation for repo creation** - flow is autonomous after matching. Template name and GitHub URL shown on dashboard as soon as available.

## Commit Patterns

### Phase 4: Template Files
Single commit with all template files.
```
"Initial commit from Shipright template: {templateName}"
```

### Phase 5: Scaffolding Injection
Single commit with all scaffolding files after Claude Code fills templates.
```
"Add project scaffolding via Shipright"
```

## Security Rules

**Always**:
- Encrypt tokens before storing in Convex (AES-256-GCM)
- Use Convex actions (server-side) for all GitHub API calls
- Validate tokens before operations

**Never**:
- Store tokens in plain text
- Expose tokens in client-side code
- Log tokens or include in error messages

## Error Handling

| Error | Action |
|-------|--------|
| Token expired (401) | Prompt user to reconnect GitHub |
| Repo name taken (422) | Auto-generate unique suffix |
| Rate limited (403) | Wait for reset, show user wait time |
| Template unavailable | Re-run matching with different template |

## Git Operations Module

Template cloning and scaffolding commits use `convex/lib/git_operations.ts` — a tested module (40+ tests) with:

- `fetchRepoFiles()` — Fetch all files via Git tree API with batch blob downloads
- `isBinaryFile()` — Binary detection by extension and size
- `createBlobsBatched()` — Create blobs in batches to avoid API overwhelming
- `commitFiles()` — Full commit: blobs → tree → commit → update ref
- `waitForRef()` — Poll for ref with exponential backoff
- `createBlobWithRetry()` — Single blob creation with retry logic

Always import from this module rather than reimplementing Git operations.

## Reference Files

- [reference.md](reference.md) - Complete OAuth flow, API examples, encryption patterns
- `convex/lib/git_operations.ts` — Tested Git operations (40+ unit tests)

## External Documentation

- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub REST API - Repos](https://docs.github.com/en/rest/repos/repos)
- [Octokit.js](https://github.com/octokit/octokit.js)

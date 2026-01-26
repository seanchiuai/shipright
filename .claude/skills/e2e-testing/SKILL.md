---
name: e2e-testing
description: E2E testing with agent-browser for phase verification
---

# E2E Testing

Uses agent-browser for end-to-end testing during Shipright development.

## What is agent-browser?

Headless browser automation CLI from Vercel Labs, designed for AI agents. Fast Rust CLI with Node.js fallback.

GitHub: https://github.com/vercel-labs/agent-browser

## Installation

```bash
npm install -g agent-browser
```

## Basic Usage

```bash
# Open a page
agent-browser open http://localhost:3000

# Get accessibility tree (AI-optimized)
agent-browser snapshot

# Interact with elements (use refs from snapshot)
agent-browser click @e2
agent-browser fill @e3 "test@example.com"

# Take screenshot
agent-browser screenshot result.png

# Close browser
agent-browser close
```

## When to Run Tests

Run E2E tests before advancing to next phase:

| Phase | What to Test |
|-------|--------------|
| 1 | Landing page loads, Google OAuth flow works, dashboard accessible |
| 2 | Interview starts, questions render, answers save |
| 3 | Requirements extracted, template matched, results displayed |
| 4 | GitHub OAuth works, repo created from template |
| 5 | Daytona sandbox runs, code committed |
| 6 | Scaffolding files generated correctly |
| 7 | Production deployment accessible |

## Phase Verification Pattern

```bash
# Example: Phase 1 verification
agent-browser open http://localhost:3000
agent-browser snapshot  # Verify landing page elements
agent-browser click @signin-button
# ... verify OAuth redirect
agent-browser screenshot phase1-complete.png
agent-browser close
```

## Why agent-browser over Playwright?

- CLI-based (simpler, no test file boilerplate)
- Accessibility tree snapshots (AI can parse easily)
- Designed for AI agents to control

## Post-MVP: User Projects

After MVP, agent-browser will be available in Daytona sandboxes for testing user-generated projects. This will be implemented as part of the post-MVP roadmap.

## Reference

- [agent-browser GitHub](https://github.com/vercel-labs/agent-browser)

---
name: e2e-testing
description: Browser-based E2E testing with agent-browser for Shipright features
---

# E2E Testing

Automated browser testing using agent-browser CLI. Tests features, captures errors, and provides analysis reports.

## Overview

This skill drives headless (or headed) browser sessions to test Shipright's user flows end-to-end. It reads test credentials from `.env.local` and uses agent-browser commands to interact with the app.

## Credentials

Test credentials are stored in `.env.local` (gitignored):

```
TEST_USERNAME=<clerk username>
TEST_PASSWORD=<clerk password>
```

Read credentials before each test session:

```bash
# Extract credentials
TEST_USERNAME=$(grep TEST_USERNAME .env.local | cut -d= -f2)
TEST_PASSWORD=$(grep TEST_PASSWORD .env.local | cut -d= -f2)
```

## Core Workflow

### 1. Launch Browser & Login

```bash
# Start fresh session
agent-browser close 2>&1
agent-browser --headed open http://localhost:3000

# Wait for page load
agent-browser wait --load networkidle

# Click sign-in trigger
agent-browser snapshot -i
# Find and click "Get started" or sign-in button
agent-browser click @<sign-in-button-ref>

# Wait for Clerk modal
sleep 1
agent-browser snapshot -i

# Fill credentials
agent-browser fill @<username-ref> "$TEST_USERNAME"
agent-browser fill @<password-ref> "$TEST_PASSWORD"
agent-browser click @<continue-ref>

# Verify redirect to dashboard
agent-browser wait --url "**/dashboard"
agent-browser get url  # Should be http://localhost:3000/dashboard
```

### 2. Test a Feature

After login, navigate and interact:

```bash
# Snapshot to find interactive elements
agent-browser snapshot -i

# Interact with elements using refs
agent-browser click @<ref>
agent-browser fill @<ref> "test input"

# Wait for results
agent-browser wait --load networkidle
agent-browser snapshot -i

# Capture state
agent-browser screenshot /tmp/test-result.png
```

### 3. Capture Errors

```bash
# Check browser console for errors
agent-browser console
agent-browser errors

# Get page content for debugging
agent-browser snapshot   # Full accessibility tree
agent-browser get url    # Current URL
agent-browser get title  # Page title
```

### 4. Cleanup

```bash
agent-browser close
```

## Test Patterns

### Landing Page Test

Verify landing page loads with all sections:

```bash
agent-browser --headed open http://localhost:3000
agent-browser wait --load networkidle
agent-browser snapshot -i

# Check key elements exist
agent-browser get text @<hero-heading>
agent-browser is visible @<cta-button>

# Check console for errors
agent-browser errors
agent-browser close
```

### Authentication Test

Verify login flow works end-to-end:

```bash
agent-browser --headed open http://localhost:3000
agent-browser snapshot -i
# Click sign-in, fill credentials, verify dashboard redirect
# (see Core Workflow above)
agent-browser errors
```

### Interview Flow Test

Verify AI interview works after login:

```bash
# After login to dashboard
agent-browser snapshot -i
# Start new interview or continue existing
# Type messages, verify AI responses appear
# Check for error states
agent-browser errors
```

### Navigation Test

Verify all routes and links work:

```bash
# Test each nav link
agent-browser click @<nav-link>
agent-browser wait --load networkidle
agent-browser get url
agent-browser errors
```

## Report Format

After each test run, produce a report:

```
## E2E Test Report

**Date:** YYYY-MM-DD HH:MM
**URL:** http://localhost:3000
**Browser:** agent-browser (Playwright)

### Tests Run
| Test | Status | Notes |
|------|--------|-------|
| Landing page load | PASS/FAIL | ... |
| Authentication | PASS/FAIL | ... |
| Dashboard access | PASS/FAIL | ... |
| Interview flow | PASS/FAIL | ... |

### Console Errors
<list any JS errors from `agent-browser errors`>

### Console Warnings
<list any warnings from `agent-browser console`>

### Analysis
- <root cause analysis for any failures>
- <suggested fixes>

### Screenshots
- /tmp/test-*.png
```

## Tips

- Always `agent-browser snapshot -i` after navigation or clicks -- refs change
- Use `sleep 1` or `agent-browser wait` between actions for async UI
- Capture `agent-browser errors` after each major step, not just at the end
- Use `--headed` during development to see what's happening
- Use `agent-browser screenshot` to capture visual state for debugging
- Close browser sessions when done to avoid stale state

## Related Files

- `.env.local` - Test credentials (TEST_USERNAME, TEST_PASSWORD)
- `src/app/page.tsx` - Landing page
- `src/app/dashboard/page.tsx` - Dashboard (protected)
- `src/app/interview/[id]/page.tsx` - Interview flow
- `src/middleware.ts` - Route protection

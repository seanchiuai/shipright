# E2E Test Log

## Test 3: Full Flow — PASS (2026-01-29)

**Test:** Create "a simple todo list app", complete interview, verify repo creation
**Result:** PASS

### Steps

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Landing page load | PASS | |
| 2 | Sign in (Clerk) | PASS | Already signed in |
| 3 | Dashboard load | PASS | |
| 4 | Create project ("a simple todo list app") | PASS | Enter key to submit |
| 5 | Interview Q1 — Platform? → "Web (browser)" | PASS | |
| 6 | Interview Q2 — Accounts? → "Yes, users should create accounts" | PASS | |
| 7 | Interview Q3 — Payments? → "Free, no payment" | PASS | |
| 8 | Interview Q4 — Features? → "Create tasks, mark complete, delete, organize by categories" | PASS | |
| 9 | Requirements summary ("TaskTrack") | PASS | |
| 10 | Click "Build My App" → project page | PASS | |
| 11 | Template matching | PASS | Convex SaaS Starter (88%) |
| 12 | Repo creation | PASS | ~25 seconds |
| 13 | Success page with GitHub link | PASS | `github.com/seanchiuai/a-simple-todo-list-app` |

### Console Warnings (non-blocking)

- Clerk development key warning (expected in dev)
- Logo aspect ratio: `Image with src "/logo.png" has either width or height modified`
- 400 resource load error (likely stale request)

### Screenshots

Saved to `/tmp/shipright-test3/`:
- `step01-landing.png` — Landing page
- `step02-dashboard.png` — Dashboard
- `step03-after-submit.png` — After submit
- `step04-interview-start.png` — Interview start
- `step05-requirements-summary.png` — Requirements summary
- `step06-project-page.png` — Creating repo spinner
- `step07-repo-created.png` — Success with GitHub link

---

## Test 2: "a simple blog" — FAIL (2026-01-29)

**Result:** FAIL — `TEMPLATE_UNAVAILABLE`
**Root cause:** Convex DB had stale template sourceUrls. The `templates:sync` mutation was run but Convex functions hadn't been redeployed, so the JSON import was stale.
**Fix:** Re-ran `npx convex dev --once` then `npx convex run templates:sync` → 3 templates updated.

---

## Test 1: "a simple todo list app" — FAIL (2026-01-29)

**Result:** FAIL at repo creation
**Root cause:** Two issues:
1. 3/10 template sourceUrls were 404 (repos moved/deleted)
2. `commitFiles` in `convex/github.ts` called `createTree` without `base_tree` and without retry

**Fixes applied:**
- Updated 3 sourceUrls in `data/templates.json`
- Added `base_tree` parameter and 3-attempt retry to `commitFiles`
- Improved error UX with friendly messages and Retry button
- Committed as `0a4fd04`

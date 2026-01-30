# Tasks — Shipright

## Active

### Phase 5: Scaffolding Injection (Daytona + Claude Code)
- [ ] Build PRD generation action (Convex/Gemini, from interview requirements)
- [ ] Build tech stack research action (identify integrations beyond base template)
- [ ] Build tech stack choice UI (when AI can't decide between options)
- [ ] Integrate Daytona SDK
- [ ] Spin up sandbox, clone user repo + cc-template repo
- [ ] Copy cc-template files into user's repo
- [ ] Run Claude Code to fill {{PLACEHOLDER}} templates (one by one, dependency order)
- [ ] Commit + push scaffolding to GitHub
- [ ] Destroy sandbox after completion
- [ ] Build scaffolding progress stepper UI
- [ ] Add error recovery (resume from last completed step)

### Phase 6: Production Deployment
- [ ] Deploy to Vercel
- [ ] Configure production environment variables
- [ ] Test full flow end-to-end in production
- [ ] Set up error monitoring

## Complete

### Phase 4: GitHub Repo Creation (2026-01-29)
- [x] Implement GitHub OAuth connection flow (connect/disconnect page)
- [x] Create API routes for OAuth redirect and callback
- [x] Clone template to user's GitHub account via Octokit
- [x] Commit template files to new private repo (Git tree API)
- [x] Handle errors (template unavailable re-matches, 422 name conflict auto-suffix, 401 reconnect)
- [x] Encrypt tokens with AES-256-GCM before Convex storage

### Phase 3: Template Matching (2026-01-28)
- [x] Define template index schema in Convex
- [x] Populate 10 curated templates with capability tags
- [x] Build template scoring algorithm (AI-determined weights)
- [x] Show matched template + GitHub URL on dashboard (no confirmation step)

### Phase 2: Interview Flow (2026-01-27, reworked 2026-01-29)
- [x] Build seed phase: app idea input with example chips
- [x] Integrate Gemini API for conversational interview (via Vertex AI)
- [x] Build conversation phase: 4-6 classification questions, ultra-casual style
- [x] Build summary phase: editable users/features, read-only type/platform/payments
- [x] Store messages in interviewMessages table (per-message, reactive)
- [x] Extract classification-focused requirements (appType, primaryUser, coreAction, etc.)
- [x] Rework: replace batched rounds with conversational flow
- [x] Rework: replace detailed extraction with fast classification (4-6 questions)

### Phase 1: UI + Authentication (2026-01-26)
- [x] Initialize Next.js 14 + TypeScript + Tailwind project
- [x] Set up Convex database
- [x] Integrate Clerk authentication with JWT verification
- [x] Create landing page with value prop + Google sign in CTA
- [x] Implement protected dashboard route
- [x] Add user avatar dropdown in header (Clerk UserButton)
- [x] Create project details page

### Planning (2026-01-25)
- [x] Define MVP scope and architecture
- [x] Research popular boilerplate templates
- [x] Research Claude Code context engineering best practices
- [x] Define template capability taxonomy
- [x] Categorize templates (1 per capability type)
- [x] Write MVP PRD
- [x] Create development phase tracking
- [x] Set up skills directory
- [x] Review and fix planning docs for consistency

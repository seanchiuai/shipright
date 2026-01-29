# Tasks — Shipright

## Active

### Phase 4: GitHub Repo Creation
- [ ] Implement GitHub OAuth connection flow
- [ ] Clone template to user's GitHub account
- [ ] Commit template files to new repo
- [ ] Handle errors (template unavailable, API failures)

### Phase 5: Template Customization (Daytona)
- [ ] Integrate Daytona SDK
- [ ] Detect when template has gaps (AI determines)
- [ ] Spin up sandbox with user's repo
- [ ] Run Claude Code to build missing features
- [ ] Commit changes continuously during build
- [ ] Destroy sandbox after completion

### Phase 6: Scaffolding Generation
- [ ] Build CLAUDE.md generator
- [ ] Build TASKS.md generator
- [ ] Build PRD.md generator
- [ ] Build skills directory generator
- [ ] Commit all scaffolding in single commit

### Phase 7: Production Deployment
- [ ] Deploy to Vercel
- [ ] Configure production environment variables
- [ ] Test full flow end-to-end in production
- [ ] Set up error monitoring

## Complete

### Phase 3: Template Matching (2026-01-28)
- [x] Define template index schema in Convex
- [x] Populate 10 curated templates with capability tags
- [x] Build template scoring algorithm (AI-determined weights)
- [x] Build template confirmation UI (what's included vs what will be built)

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

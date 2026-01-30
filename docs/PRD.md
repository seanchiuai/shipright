# PRD: Shipright MVP

## Introduction

Shipright MVP is a web application that helps non-technical founders build apps by matching their requirements to curated boilerplate templates and generating AI-ready project scaffolding. Users describe their app through a guided interview, Shipwright matches them to the best template, and generates a GitHub repository with the template plus agentic context files (CLAUDE.md, TASKS.md, PRD.md) optimized for AI-assisted development.

**Target Users:** Non-technical founders and builders who want to create apps without learning technical details.

**Core Value:** Turn "I want to build X" into a production-ready codebase with AI-optimized scaffolding in minutes.

---

## Goals

- Allow non-technical users to describe their app idea through a guided interview
- Match user requirements to the best-fit curated template from a library of 10 categories
- Generate a GitHub repository with the selected template + agentic scaffolding files
- Produce CLAUDE.md, TASKS.md, and PRD.md files that enable effective AI-assisted development
- Show template selection and GitHub URL on dashboard during build

---

## User Stories

### US-001: Authentication via Clerk
**Description:** As a user, I want to sign in with Google so that I can save my projects and access them later.

**Acceptance Criteria:**
- [x] Sign in button on landing page (Clerk SignInButton)
- [x] User redirected to Clerk-managed sign-in page
- [x] On success, user is redirected to dashboard
- [x] User's profile (name, email, avatar) available via Clerk
- [x] Session persists across browser refreshes via Clerk
- [x] Logout via Clerk UserButton or signOut
- [x] Typecheck passes

### US-002: Landing Page
**Description:** As a visitor, I want to understand what Shipwright does so that I can decide to sign up.

**Acceptance Criteria:**
- [x] Hero section with value proposition: "Describe your app. Get a production-ready codebase."
- [x] "Sign in with Google" CTA button
- [x] Brief explanation of the 3-step process (Describe → Match → Build)
- [x] No pricing or marketplace mentions (out of scope)
- [x] Typecheck passes
- [x] Verify in browser

### US-003: Interview Flow - Seed Phase (App Idea)
**Description:** As a user, I want to describe my app idea in plain language so that Shipright understands what I'm building.

**Acceptance Criteria:**
- [x] Single text area with prompt and example idea chips
- [x] Character limit indicator (500 chars max)
- [x] Submit triggers AI conversation (no separate confirmation step)
- [x] Input saved to Convex project record
- [x] Typecheck passes
- [x] Verify in browser

### US-004: Interview Flow - Conversation Phase (AI Follow-up)
**Description:** As a user, I want to have a natural conversation with the AI so that it fully understands my requirements.

**Acceptance Criteria:**
- [x] AI asks one question at a time (not batched rounds)
- [x] AI picks question type dynamically: choice, multiselect, or text
- [x] Questions cover: user types, auth needs, data model, core features, integrations
- [x] Mini-summaries shown every 2-3 answers
- [x] AI signals completion when extraction checklist satisfied (or 10-exchange cap)
- [x] Messages stored per-message in interviewMessages table (reactive query)
- [x] "I've shared enough" link to finish early
- [x] Page reload resumes conversation from DB
- [x] Typecheck passes
- [x] Verify in browser

### US-005: Interview Flow - Summary Phase (Requirements Review)
**Description:** As a user, I want to see a summary of my requirements before Shipright matches a template so that I can confirm accuracy.

**Acceptance Criteria:**
- [x] Display structured summary: app name, problem, user types, features, auth, database, integrations
- [x] User can edit app name, problem statement inline
- [x] User can add/edit/remove features and user types
- [x] "Build My App" button proceeds to matching
- [x] "Continue Conversation" button returns to conversation phase
- [x] Typecheck passes
- [x] Verify in browser

### US-006: Template Matching Engine
**Description:** As a system, I need to match user requirements to the best-fit template so that users get the most appropriate starting point.

**Acceptance Criteria:**
- [x] Parse structured requirements from interview
- [x] Score each template in index against requirements
- [x] Scoring considers: auth type, database type, payments, real-time needs, UI components
- [x] Return top match with confidence score
- [x] If no good match (score < 50%), fallback to minimal Next.js starter
- [x] Matching logic runs as Convex action
- [x] Typecheck passes

### US-007: Template Selection Visibility
**Description:** As a user, I want to see which template was matched on my dashboard so I know what's being used for scaffolding.

**Acceptance Criteria:**
- [x] Dashboard shows matched template name during/after build
- [x] Show "What's included" checklist (auth, database, payments, etc.)
- [x] Show "What will be built" list (features from requirements not in template)
- [x] Repo creation starts automatically after matching (no confirmation step)
- [x] GitHub URL shown on dashboard as soon as repo is created
- [x] Typecheck passes
- [x] Verify in browser

### US-008: GitHub Repository Generation
**Description:** As a user, I want Shipright to automatically create a GitHub repository with my template so that I have a codebase to work with.

**Acceptance Criteria:**
- [x] User must have connected GitHub account (OAuth) before build starts
- [x] Repository name auto-generated from app name (no user prompt, can rename on GitHub later)
- [x] Repository created as **private** by default
- [x] Template files fetched via GitHub API and committed to new repo
- [x] If template unavailable, re-run matching with next best template
- [x] Initial commit with message: "Initial commit from Shipright template: {templateName}"
- [x] Repo creation starts automatically after matching — no user confirmation required
- [x] GitHub URL shown on dashboard immediately after repo is created
- [x] Success screen shown after scaffolding complete (Phase 5)
- [x] Typecheck passes

### US-009: GitHub OAuth Connection
**Description:** As a user, I want to connect my GitHub account so that Shipright can create repositories on my behalf.

**Acceptance Criteria:**
- [x] "Connect GitHub" button shown before first build (if not already connected)
- [x] GitHub OAuth flow requests `repo` + `user:email` scopes
- [x] User redirected to GitHub to authorize
- [x] GitHub access token encrypted (AES-256-GCM) and stored in Convex
- [x] Token validated before any GitHub operations
- [x] User can disconnect GitHub from settings/profile
- [x] If token expires (401 error), prompt user to reconnect
- [x] Typecheck passes

### US-010: CLAUDE.md Generation
**Description:** As a system, I need to generate a CLAUDE.md file tailored to the user's project so that AI agents can effectively work on the codebase.

**Acceptance Criteria:**
- [x] CLAUDE.md includes: overview, tech stack, commands, project structure, code style, boundaries
- [x] Overview section uses user's app description
- [x] Tech stack section reflects actual template stack
- [x] Commands section includes exact npm scripts from template
- [x] Project structure is vague (not specific file paths) to remain stable during development
- [x] Boundaries section includes "Always do", "Ask first", "Never do" lists
- [x] Contains only stable info that won't need frequent updates
- [x] Under 100 lines recommended (not a hard limit)
- [x] Typecheck passes

### US-011: TASKS.md Generation
**Description:** As a system, I need to generate a TASKS.md file with the user's feature backlog so that AI agents know what to build.

**Acceptance Criteria:**
- [x] TASKS.md includes: Current Sprint, Backlog, Completed sections
- [x] Current Sprint populated with first 3-5 features from requirements
- [x] Backlog populated with remaining features
- [x] Features written as actionable task descriptions
- [x] Typecheck passes

### US-012: PRD.md Generation
**Description:** As a system, I need to generate a PRD.md file documenting the user's requirements so that AI agents understand the product context. This is a kickstart document used for initial planning and implementation plan generation.

**Acceptance Criteria:**
- [x] PRD.md includes: Problem, Users, Core Features, Data Model, User Flows
- [x] Content derived from interview answers
- [x] Written in plain language (user can understand it)
- [x] High-level document (not used frequently during development, just to start)
- [x] Typecheck passes

### US-012b: Skills Directory Generation
**Description:** As a system, I need to generate a `.claude/skills/` directory with domain-specific skills so that AI agents have on-demand access to specialized knowledge.

**Acceptance Criteria:**
- [x] Skills directory created at `.claude/skills/`
- [x] Skills organized by domain (e.g., authentication/, api/, database/) based on requirements
- [x] Each skill has a `SKILL.md` file with proper frontmatter and instructions
- [x] Skills cover the key domains identified in the interview
- [x] Skills load on-demand (progressive disclosure) vs CLAUDE.md which always loads
- [x] No MCP server configurations generated (not supported)
- [x] No hooks generated (not supported)
- [x] Typecheck passes

### US-012c: Scaffolding Injection via Daytona Sandbox
**Description:** As a system, I need to use Daytona sandboxes with Claude Code to inject cc-template files and fill {{PLACEHOLDER}} values with project-specific content, producing a fully scaffolded repo ready for AI-assisted development.

**Acceptance Criteria:**
- [x] Generate PRD markdown from interview requirements (Convex action, pre-sandbox)
- [x] Research tech stack integrations beyond base template (Convex action, pre-sandbox)
- [x] If AI can't choose between integration options, present choices to user for approval
- [x] Spin up ephemeral Daytona sandbox
- [x] Clone user's GitHub repo and cc-template repo into sandbox
- [x] Copy cc-template files (.claude/, template files) into user's repo
- [x] Run Claude Code to fill {{PLACEHOLDER}} templates one by one in dependency order
- [x] Templates filled: PRD.md, design.md, CLAUDE.md, TASKS.md, development-progress.yaml, prompts/, skills/
- [x] All scaffolding committed and pushed to user's GitHub repo
- [x] Sandbox destroyed after completion
- [x] Pipeline is resumable (each step saves output, retry from failure point)
- [x] Error handling for sandbox timeout, Claude Code failures, git push failures
- [x] Typecheck passes

### US-013: User Dashboard
**Description:** As a user, I want to see my projects so that I can access them later.

**Acceptance Criteria:**
- [x] List of user's projects with: name, created date, GitHub repo link
- [x] "New Project" button starts interview flow
- [x] Click on project shows project details
- [x] Typecheck passes
- [x] Verify in browser

### US-014: Template Index Management (Admin)
**Description:** As an admin, I need to manage the template index so that users get matched to quality templates.

**Acceptance Criteria:**
- [x] Template index stored in Convex
- [x] Each template has: id, name, source URL, capabilities (tagged), stack, description
- [x] Capabilities follow defined taxonomy (auth types, db types, payments, features)
- [x] Admin can add/edit/remove templates via Convex dashboard (no UI needed for MVP)
- [x] Typecheck passes

### US-015: Production Deployment
**Description:** As a developer, I need to deploy Shipright to production so that users can access it.

**Acceptance Criteria:**
- [ ] Shipright deployed to Vercel
- [ ] Convex deployed to production
- [ ] All environment variables configured (Claude API, GitHub OAuth, Clerk, Daytona)
- [ ] Landing page accessible at production URL
- [ ] Clerk authentication works in production
- [ ] GitHub OAuth works in production
- [ ] Full flow tested end-to-end in production
- [ ] Error monitoring in place (Vercel logs, Convex dashboard)

---

## Functional Requirements

### Authentication
- FR-1: Users authenticate via Clerk (Google OAuth)
- FR-2: Users can connect GitHub account for repo creation
- FR-3: Session persists via Clerk

### Interview Flow
- FR-4: Interview begins with seed phase (open-ended idea input with example chips)
- FR-5: AI conducts conversational interview, one question at a time with dynamic question types
- FR-6: AI signals completion when checklist satisfied or 10-exchange cap reached
- FR-7: Interview produces structured requirements object via extraction
- FR-8: User can review and edit requirements (features, user types) before matching

### Template Matching
- FR-9: Template index contains 10 curated templates (1 per capability category)
- FR-10: Matching scores templates against requirements on: auth, database, payments, real-time, features
- FR-11: Best match is presented to user with confidence score
- FR-12: Fallback to minimal Next.js starter if no good match

### Repository Generation
- FR-13: Repository created under user's GitHub account
- FR-14: Template files cloned to repository
- FR-15: CLAUDE.md generated and added to repository root
- FR-16: TASKS.md generated and added to repository root
- FR-17: PRD.md generated and added to repository root
- FR-18: Initial commit created with all files

### Dashboard
- FR-19: User can view list of their projects
- FR-20: User can start new project from dashboard
- FR-21: User can access GitHub repo from project card

---

## Non-Goals (Out of Scope for MVP)

- **Marketplace:** No template marketplace or community submissions
- **Template manual selection:** User cannot browse/pick templates manually (only AI-matched)
- **Plan generation:** No architecture/implementation plan generation
- **Payments/billing:** No paid features or subscriptions
- **App building:** No automated app building in MVP (scaffolding only, user builds with Claude Code)
- **Multiple templates per project:** One template per project only
- **Team collaboration:** Single-user projects only
- **Deployment:** No deploy-to-Vercel or similar features
- **MCP servers:** No MCP server configurations in generated scaffolding
- **Hooks:** No hook configurations in generated scaffolding

---

## Technical Considerations

### Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Convex (real-time, serverless)
- **Auth:** Clerk (Google OAuth provider)
- **UI:** shadcn/ui + Tailwind CSS
- **AI:** Claude API for interview question generation and requirement extraction
- **GitHub:** GitHub OAuth + GitHub API for repo creation
- **Sandboxes:** Daytona SDK for scaffolding injection (cc-template + Claude Code fills placeholders)
- **Deployment:** Vercel for production hosting

### Template Index Schema
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  sourceUrl: string; // GitHub URL to clone from
  stack: string[]; // ["nextjs", "typescript", "convex", "clerk"]
  capabilities: {
    auth: {
      present: boolean;
      providers: ("email" | "google" | "github" | "magic-link")[];
      hasRoles: boolean;
      hasOrgs: boolean;
    };
    database: {
      present: boolean;
      type: "convex" | "supabase" | "prisma-postgres" | "drizzle";
      realtime: boolean;
    };
    payments: {
      present: boolean;
      provider?: "stripe" | "lemonsqueezy";
      models?: ("one-time" | "subscription")[];
    };
    ui: {
      framework: "shadcn" | "tremor" | "tailwind-only";
      hasAdminDashboard: boolean;
      hasLandingPage: boolean;
    };
    features: {
      fileUploads: boolean;
      email: boolean;
      search: boolean;
      ai: boolean;
    };
  };
}
```

### Requirements Schema
```typescript
interface Requirements {
  appName: string;
  problemStatement: string;
  userTypes: {
    name: string;
    description: string;
    isAdmin: boolean;
  }[];
  auth: {
    needed: boolean;
    methods: ("email" | "google" | "github")[];
    hasRoles: boolean;
    hasOrgs: boolean;
  };
  database: {
    needed: boolean;
    realtime: boolean;
  };
  payments: {
    needed: boolean;
    model?: "one-time" | "subscription";
  };
  features: {
    name: string;
    description: string;
    priority: "must" | "should" | "could";
  }[];
  integrations: string[];
}
```

### Template Categories (10 for MVP)
1. Minimal Starter (no auth, no db) - `create-next-app`
2. Simple Auth Only - `next-auth-example`
3. Simple DB Only - `prisma-examples/nextjs`
4. Auth + DB (Basic Stack) - `create-t3-app`
5. Auth + DB + Payments (SaaS) - `next-forge`
6. Real-time + Auth - `convex-saas-starter`
7. AI Chat - `vercel/ai-chatbot`
8. E-commerce - `vercel/commerce`
9. Admin Dashboard - `next-shadcn-dashboard-starter`
10. Multi-tenant SaaS - `ixartz/SaaS-Boilerplate`

---

## Success Metrics

- User can go from "I have an app idea" to "I have a GitHub repo" in under 10 minutes
- 80%+ of users complete the interview flow without abandoning
- Generated CLAUDE.md files enable effective AI-assisted development (qualitative)
- Template match satisfaction: users accept matched template without restarting 70%+ of the time

---

## Resolved Questions

1. **GitHub OAuth scope:** `repo` (for private repo creation) + `user:email` (for identification). Using `repo` instead of `public_repo` because repos are private by default.

2. **Rate limiting:** GitHub allows 5,000 requests/hour per authenticated user. Implement backoff and show wait time to user if rate limited.

3. **Template updates:** Templates are public GitHub repos. If a template becomes unavailable (deleted/private), re-run matching with next best template. Admin gets notified to update template index.

4. **Error handling:**
   - GitHub API failure: Inform user, offer retry
   - Daytona timeout: Inform user, offer retry
   - Claude API rate limit: Wait for reset, continue automatically
   - Template unavailable: Re-match to different template

5. **Template licensing:** Include attribution in generated README. Most templates use MIT license which permits this use.

## Open Questions

1. **Interview flow UX:** Step 2 form layout, question types, back navigation behavior - needs detailed design.

2. **cc-template evolution:** How to version/update the cc-template repo as Shipright's methodology evolves. Currently a single public repo cloned at scaffold time.

---

## Appendix: Template Capability Taxonomy

### Auth Types
- `email` - Email/password authentication
- `google` - Google OAuth
- `github` - GitHub OAuth
- `magic-link` - Passwordless email link
- `sso` - Enterprise SSO (SAML/OIDC)

### Database Types
- `convex` - Convex real-time database
- `supabase` - Supabase (Postgres + real-time)
- `prisma-postgres` - Prisma ORM with PostgreSQL
- `drizzle` - Drizzle ORM
- `firebase` - Firebase Firestore

### Payment Models
- `one-time` - Single purchase
- `subscription` - Recurring billing
- `marketplace` - Multi-party transactions

### UI Frameworks
- `shadcn` - shadcn/ui component library
- `tremor` - Tremor dashboard components
- `chakra` - Chakra UI
- `tailwind-only` - Just Tailwind, no component library

### Feature Flags
- `fileUploads` - File/image upload support
- `email` - Transactional email support
- `search` - Full-text search
- `ai` - AI/LLM integration
- `i18n` - Internationalization
- `darkMode` - Dark mode toggle

# PRD: Shipwright v2 MVP

## Introduction

Shipwright v2 MVP is a web application that helps non-technical founders build apps by matching their requirements to curated boilerplate templates and generating AI-ready project scaffolding. Users describe their app through a guided interview, Shipwright matches them to the best template, and generates a GitHub repository with the template plus agentic context files (CLAUDE.md, TASKS.md, PRD.md) optimized for AI-assisted development.

**Target Users:** Non-technical founders and builders who want to create apps without learning technical details.

**Core Value:** Turn "I want to build X" into a production-ready codebase with AI-optimized scaffolding in minutes.

---

## Goals

- Allow non-technical users to describe their app idea through a guided interview
- Match user requirements to the best-fit curated template from a library of 10 categories
- Generate a GitHub repository with the selected template + agentic scaffolding files
- Produce CLAUDE.md, TASKS.md, and PRD.md files that enable effective AI-assisted development
- Provide clear confirmation flow before any repo creation

---

## User Stories

### US-001: Google OAuth Authentication
**Description:** As a user, I want to sign in with Google so that I can save my projects and access them later.

**Acceptance Criteria:**
- [ ] Google OAuth login button on landing page
- [ ] User redirected to Google consent screen
- [ ] On success, user is redirected to dashboard
- [ ] User's Google profile (name, email, avatar) stored in Convex
- [ ] Session persists across browser refreshes
- [ ] Logout button clears session
- [ ] Typecheck passes

### US-002: Landing Page
**Description:** As a visitor, I want to understand what Shipwright does so that I can decide to sign up.

**Acceptance Criteria:**
- [ ] Hero section with value proposition: "Describe your app. Get a production-ready codebase."
- [ ] "Sign in with Google" CTA button
- [ ] Brief explanation of the 3-step process (Describe → Match → Build)
- [ ] No pricing or marketplace mentions (out of scope)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-003: Interview Flow - Step 1 (App Idea)
**Description:** As a user, I want to describe my app idea in plain language so that Shipwright understands what I'm building.

**Acceptance Criteria:**
- [ ] Single text area with prompt: "Tell me about your app in one sentence"
- [ ] Character limit indicator (500 chars max)
- [ ] "Next" button submits and proceeds
- [ ] Input saved to Convex project record
- [ ] Typecheck passes
- [ ] Verify in browser

### US-004: Interview Flow - Step 2 (AI Follow-up Questions)
**Description:** As a user, I want to answer clarifying questions so that Shipwright fully understands my requirements.

**Acceptance Criteria:**
- [ ] AI generates 3-5 follow-up questions based on Step 1 input
- [ ] Questions displayed as form fields (text inputs, dropdowns, or checkboxes as appropriate)
- [ ] Questions cover: user types, auth needs, data model, core features, integrations
- [ ] User can submit answers and see next round of questions if AI needs more clarity
- [ ] Maximum 3 rounds of questions before proceeding
- [ ] All answers saved to Convex project record
- [ ] Typecheck passes
- [ ] Verify in browser

### US-005: Interview Flow - Step 3 (Requirements Summary)
**Description:** As a user, I want to see a summary of my requirements before Shipwright matches a template so that I can confirm accuracy.

**Acceptance Criteria:**
- [ ] Display structured summary: app name, problem, user types, features, auth, database, integrations
- [ ] User can edit any field inline
- [ ] "Confirm & Find Template" button proceeds to matching
- [ ] "Start Over" button resets interview
- [ ] Typecheck passes
- [ ] Verify in browser

### US-006: Template Matching Engine
**Description:** As a system, I need to match user requirements to the best-fit template so that users get the most appropriate starting point.

**Acceptance Criteria:**
- [ ] Parse structured requirements from interview
- [ ] Score each template in index against requirements
- [ ] Scoring considers: auth type, database type, payments, real-time needs, UI components
- [ ] Return top match with confidence score
- [ ] If no good match (score < 50%), fallback to minimal Next.js starter
- [ ] Matching logic runs as Convex action
- [ ] Typecheck passes

### US-007: Template Selection Confirmation
**Description:** As a user, I want to see the matched template and confirm before Shipwright creates my repository.

**Acceptance Criteria:**
- [ ] Display matched template: name, description, included features
- [ ] Show "What's included" checklist (auth, database, payments, etc.)
- [ ] Show "What will be built" list (features from requirements not in template)
- [ ] "Create My Repository" button proceeds to repo generation
- [ ] "Try Different Template" button (future: manual selection, for now: restart interview)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-008: GitHub Repository Generation
**Description:** As a user, I want Shipwright to create a GitHub repository with my template so that I have a codebase to work with.

**Acceptance Criteria:**
- [ ] User must have connected GitHub account (OAuth)
- [ ] Prompt for repository name (auto-suggested from app name)
- [ ] Repository created under user's GitHub account
- [ ] Template files cloned into repository
- [ ] Agentic scaffolding files (CLAUDE.md, TASKS.md, PRD.md) added to repository
- [ ] Initial commit with message: "Initial commit from Shipwright"
- [ ] Success screen with link to new repository
- [ ] Typecheck passes

### US-009: GitHub OAuth Connection
**Description:** As a user, I want to connect my GitHub account so that Shipwright can create repositories on my behalf.

**Acceptance Criteria:**
- [ ] "Connect GitHub" button in user settings or during repo generation flow
- [ ] GitHub OAuth flow with repo creation scope
- [ ] GitHub access token stored securely in Convex
- [ ] User can disconnect GitHub from settings
- [ ] Typecheck passes

### US-010: CLAUDE.md Generation
**Description:** As a system, I need to generate a CLAUDE.md file tailored to the user's project so that AI agents can effectively work on the codebase.

**Acceptance Criteria:**
- [ ] CLAUDE.md includes: overview, tech stack, commands, project structure, code style, boundaries
- [ ] Overview section uses user's app description
- [ ] Tech stack section reflects actual template stack
- [ ] Commands section includes exact npm scripts from template
- [ ] Project structure reflects actual directory layout
- [ ] Boundaries section includes "Always do", "Ask first", "Never do" lists
- [ ] File is under 100 lines
- [ ] Typecheck passes

### US-011: TASKS.md Generation
**Description:** As a system, I need to generate a TASKS.md file with the user's feature backlog so that AI agents know what to build.

**Acceptance Criteria:**
- [ ] TASKS.md includes: Current Sprint, Backlog, Completed sections
- [ ] Current Sprint populated with first 3-5 features from requirements
- [ ] Backlog populated with remaining features
- [ ] Features written as actionable task descriptions
- [ ] Typecheck passes

### US-012: PRD.md Generation
**Description:** As a system, I need to generate a PRD.md file documenting the user's requirements so that AI agents understand the product context.

**Acceptance Criteria:**
- [ ] PRD.md includes: Problem, Users, Core Features, Data Model, User Flows
- [ ] Content derived from interview answers
- [ ] Written in plain language (user can understand it)
- [ ] Typecheck passes

### US-013: User Dashboard
**Description:** As a user, I want to see my projects so that I can access them later.

**Acceptance Criteria:**
- [ ] List of user's projects with: name, created date, GitHub repo link
- [ ] "New Project" button starts interview flow
- [ ] Click on project shows project details
- [ ] Typecheck passes
- [ ] Verify in browser

### US-014: Template Index Management (Admin)
**Description:** As an admin, I need to manage the template index so that users get matched to quality templates.

**Acceptance Criteria:**
- [ ] Template index stored in Convex
- [ ] Each template has: id, name, source URL, capabilities (tagged), stack, description
- [ ] Capabilities follow defined taxonomy (auth types, db types, payments, features)
- [ ] Admin can add/edit/remove templates via Convex dashboard (no UI needed for MVP)
- [ ] Typecheck passes

---

## Functional Requirements

### Authentication
- FR-1: Users authenticate via Google OAuth
- FR-2: Users can connect GitHub account for repo creation
- FR-3: Session persists via Convex auth

### Interview Flow
- FR-4: Interview begins with single open-ended question
- FR-5: AI generates follow-up questions based on user input
- FR-6: Maximum 3 rounds of follow-up questions
- FR-7: Interview produces structured requirements object
- FR-8: User can review and edit requirements before matching

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
- **Daytona integration:** No sandbox execution or Ralph loops
- **Payments/billing:** No paid features or subscriptions
- **Template customization UI:** No UI for tweaking template before generation
- **Multiple templates per project:** One template per project only
- **Team collaboration:** Single-user projects only
- **Deployment:** No deploy-to-Vercel or similar features

---

## Technical Considerations

### Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Convex (real-time, serverless)
- **Auth:** Convex Auth with Google OAuth provider
- **UI:** shadcn/ui + Tailwind CSS
- **AI:** Claude API for interview question generation and requirement extraction
- **GitHub:** GitHub OAuth + GitHub API for repo creation

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
- Template match satisfaction: users confirm matched template on first try 70%+ of the time

---

## Open Questions

1. **GitHub OAuth scope:** What exact scopes needed for repo creation? (repo, user:email)
2. **Rate limiting:** How to handle users creating many repos quickly?
3. **Template updates:** How to update template index when upstream templates change?
4. **Error handling:** What happens if GitHub repo creation fails mid-process?
5. **Template licensing:** How to handle attribution for open-source templates?

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

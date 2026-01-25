# PRD: Shipright v2 — AI-Powered App Foundation Builder

## Introduction

Shipright is a web application that helps developers discover what they truly want to build and generates a solid foundation for their web app. Instead of building the complete app autonomously, Shipright focuses on laying the best possible base — a working MVP with authentication, database, and core features — so developers can continue building with their preferred tools.

**Core Value Proposition:** Turn a single sentence into a production-ready foundation through AI-guided discovery and autonomous building.

---

## Goals

- Help users clarify their app idea through AI-guided conversation
- Research best practices and optimal architecture for the specific app
- Generate a working MVP foundation with auth, database, and core pages
- Provide live preview so users can see and test their app
- Enable iteration through conversational refinement
- Deliver downloadable code that developers can continue building

---

## User Stories

### US-001: User Authentication
**Description:** As a user, I want to sign up and log in so I can access my projects.

**Acceptance Criteria:**
- [ ] User can sign up with email or OAuth (Google, GitHub)
- [ ] User can log in to existing account
- [ ] User sees dashboard with their projects after login
- [ ] Authentication handled by Clerk
- [ ] Unauthorized users redirected to login

### US-002: Create New Project
**Description:** As a user, I want to describe my app idea in a single text box so the AI can help me build it.

**Acceptance Criteria:**
- [ ] Dashboard has "New Project" button
- [ ] Single text input for app description (no name, no multi-step form)
- [ ] Example placeholder: "I want to build an app where people can share book recommendations"
- [ ] Submit starts the Discovery phase
- [ ] Project created in database with status "discovery"

### US-003: Discovery Phase — Clarifying Questions
**Description:** As a user, I want the AI to ask me clarifying questions so it understands exactly what I want to build.

**Acceptance Criteria:**
- [ ] After submitting idea, AI asks clarifying questions one at a time
- [ ] Questions cover: target users, core features, authentication needs, data relationships
- [ ] User answers in chat interface
- [ ] AI summarizes understanding and confirms before proceeding
- [ ] All Q&A stored in database as chat history
- [ ] Discovery phase is interactive (user participates)

### US-004: Research Phase — Autonomous Planning
**Description:** As the system, I need to research best practices and plan the architecture before building.

**Acceptance Criteria:**
- [ ] Research phase starts automatically after Discovery completes
- [ ] Uses Gemini 3 Pro Preview API for research
- [ ] Researches: optimal architecture, database schema, component structure, edge cases
- [ ] Considers the specific app type and requirements from Discovery
- [ ] Generates technical plan (not shown to user in detail)
- [ ] User sees status: "Researching best practices..."
- [ ] Phase is fully autonomous (no user input needed)

### US-005: Build Phase — Autonomous Construction
**Description:** As the system, I need to build the MVP foundation inside a Daytona sandbox.

**Acceptance Criteria:**
- [ ] Build phase starts automatically after Research completes
- [ ] Creates Daytona sandbox for this project
- [ ] Installs Claude Code in sandbox
- [ ] Claude Code builds the app step by step following the plan
- [ ] Creates: file structure, database schema, auth setup, core pages, API routes
- [ ] Connects to shared Supabase project (multi-tenant)
- [ ] User sees progress updates: "Setting up authentication...", "Creating database tables..."
- [ ] Phase is fully autonomous (no user input needed)

### US-006: Live Preview
**Description:** As a user, I want to see a live preview of my app so I can test it while it's being built.

**Acceptance Criteria:**
- [ ] Dev server starts in Daytona sandbox (npm run dev)
- [ ] Preview URL exposed and shown to user
- [ ] Preview embedded in right panel of UI (iframe)
- [ ] Preview updates as Claude makes changes
- [ ] URL is public but unguessable (no auth required for preview)
- [ ] User can share URL if they choose

### US-007: Iteration — Request Changes
**Description:** As a user, I want to request changes to my app after the initial build so I can refine it.

**Acceptance Criteria:**
- [ ] After build completes, chat remains active
- [ ] User can type change requests: "Add a dark mode toggle"
- [ ] New Claude Code session starts in same sandbox
- [ ] Claude modifies existing files (doesn't rebuild from scratch)
- [ ] Preview updates to reflect changes
- [ ] Multiple iterations supported

### US-008: Download Project
**Description:** As a user, I want to download my project as a zip file so I can continue development locally.

**Acceptance Criteria:**
- [ ] "Download" button visible after build completes
- [ ] Clicking downloads zip of entire project
- [ ] Zip includes all source files, package.json, README with setup instructions
- [ ] Zip excludes node_modules
- [ ] README includes Supabase credentials and setup steps

### US-009: Project Management
**Description:** As a user, I want to manage multiple projects so I can work on different apps.

**Acceptance Criteria:**
- [ ] Dashboard shows list of all user's projects
- [ ] Each project shows: name (auto-generated from idea), status, last updated
- [ ] User can click project to open it
- [ ] User can delete projects
- [ ] Deleted projects have their sandbox destroyed

### US-010: Sandbox Lifecycle
**Description:** As the system, I need to manage sandbox resources efficiently.

**Acceptance Criteria:**
- [ ] Sandbox created when build phase starts
- [ ] Sandbox stays alive while user is active
- [ ] Sandbox sleeps after 10 minutes of inactivity
- [ ] User can wake sandbox by opening project
- [ ] Waking sandbox restores files and restarts dev server
- [ ] Sandbox destroyed when project deleted

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌─────────────────────────┬─────────────────────────────────┐  │
│  │      CHAT SIDEBAR       │         PREVIEW PANEL           │  │
│  │                         │                                 │  │
│  │  [User input box]       │    ┌─────────────────────┐     │  │
│  │                         │    │   Live Preview      │     │  │
│  │  Chat history...        │    │   (iframe)          │     │  │
│  │                         │    │                     │     │  │
│  │  Status: Building...    │    └─────────────────────┘     │  │
│  │  Phase: Database        │                                 │  │
│  └─────────────────────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SHIPRIGHT SERVER                            │
│                                                                  │
│  Next.js API Routes                                              │
│  ├── /api/projects         (CRUD operations)                    │
│  ├── /api/chat             (Process user messages)              │
│  ├── /api/sandbox          (Manage Daytona sandboxes)           │
│  └── /api/download         (Generate zip files)                 │
│                                                                  │
│  Integrations:                                                   │
│  ├── Clerk (authentication)                                      │
│  ├── Convex (database for Shipright)                            │
│  ├── Daytona SDK (sandbox management)                           │
│  ├── Claude Code (building apps)                                │
│  └── Gemini API (research phase)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────────┐
│  DAYTONA        │  │   CONVEX    │  │    SUPABASE     │
│  SANDBOX        │  │             │  │    (shared)     │
│                 │  │  Projects   │  │                 │
│  Claude Code    │  │  Chats      │  │  Generated app  │
│  Generated app  │  │  Users      │  │  databases      │
│  Dev server     │  │  Sandboxes  │  │  (multi-tenant) │
│                 │  │             │  │                 │
└─────────────────┘  └─────────────┘  └─────────────────┘
```

### Data Flow

**Creating a new project:**
```
1. User submits app idea
2. Server creates project in Convex (status: discovery)
3. Server sends idea to Claude Code (via prompt)
4. Claude asks clarifying questions
5. Server stores Q&A in Convex
6. User answers, cycle repeats
7. When discovery complete, status → research
8. Server calls Gemini API for research
9. Gemini returns technical plan
10. Status → build
11. Server creates Daytona sandbox
12. Server installs Claude Code in sandbox
13. Claude builds app following plan
14. Server creates Supabase tables for this project (in shared instance)
15. Claude connects app to Supabase
16. Dev server starts, preview URL returned
17. Status → complete
18. User can iterate or download
```

### Phase Details

**Phase 1: Discovery (Interactive)**
- Claude Code receives system prompt for discovery mode
- Prompt instructs Claude to ask clarifying questions
- Claude asks about: users, features, data, workflows
- User answers are appended to conversation
- Claude summarizes and confirms understanding
- Output: Clear requirements document

**Phase 2: Research (Autonomous)**
- Gemini 3 Pro Preview receives requirements
- Gemini researches: architecture patterns, database design, component structure
- Gemini considers edge cases and best practices
- Output: Technical plan (internal, not shown to user)
- User sees: "Researching best practices..."

**Phase 3: Build (Autonomous)**
- Daytona sandbox created
- Claude Code installed and authenticated
- Claude receives technical plan as system prompt
- Claude builds step by step:
  1. Initialize Next.js project
  2. Install dependencies
  3. Set up Tailwind + shadcn/ui
  4. Configure Supabase connection
  5. Create database schema
  6. Set up Supabase Auth
  7. Build pages and components
  8. Create API routes
  9. Start dev server
- User sees progress summaries (not raw Claude output)

**Phase 4: Iterate (User-triggered)**
- User types change request in chat
- New Claude Code session in same sandbox
- Claude reads existing files, makes changes
- Preview updates automatically
- Can iterate multiple times

---

## Database Schema (Convex)

### projects
```typescript
{
  _id: Id<"projects">,
  userId: string,              // Clerk user ID
  idea: string,                // Original user input
  name: string,                // Auto-generated from idea
  status: "discovery" | "research" | "build" | "complete" | "error",
  sandboxId: string | null,    // Daytona sandbox ID
  sandboxStatus: "running" | "sleeping" | "destroyed",
  previewUrl: string | null,   // Live preview URL
  supabaseSchema: string,      // Tenant identifier in shared Supabase
  createdAt: number,
  updatedAt: number,
}
```

### messages
```typescript
{
  _id: Id<"messages">,
  projectId: Id<"projects">,
  role: "user" | "assistant" | "system",
  content: string,
  phase: "discovery" | "research" | "build" | "iterate",
  createdAt: number,
}
```

### buildProgress
```typescript
{
  _id: Id<"buildProgress">,
  projectId: Id<"projects">,
  phase: string,               // "auth", "database", "pages", etc.
  status: "pending" | "in_progress" | "complete" | "error",
  message: string,             // Human-readable status
  updatedAt: number,
}
```

---

## Integrations

### Clerk (Authentication)
- Handles user signup/login
- OAuth providers: Google, GitHub
- Provides userId for all database operations
- Webhook for user deletion (cleanup projects)

### Convex (Shipright Database)
- Real-time sync for chat messages
- Project state management
- Build progress updates
- No need for polling — Convex pushes updates

### Daytona (Sandboxes)
- Create sandbox: `daytona.create({ language: 'typescript', envVars, autoStopInterval: 10 })`
- Execute commands: `daytona.exec(sandboxId, command, { stream: true })`
- Get preview URL: Port forwarding via Daytona API
- Destroy sandbox: `daytona.destroy(sandboxId)`

### Claude Code (Build AI)
- Installed in Daytona sandbox
- Authenticated via `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`
- Run with: `claude "[prompt]" --dangerously-skip-permissions`
- Each phase has specific system prompt (stored in /prompts folder)

### Gemini API (Research AI)
- Model: `gemini-3-pro-preview`
- Used only in Research phase
- Input: Requirements from Discovery
- Output: Technical plan for Build phase

### Supabase (Generated App Database)
- Shared project with multi-tenancy
- Each user project gets unique schema prefix
- Tables: `{projectId}_users`, `{projectId}_posts`, etc.
- Auth: Supabase Auth configured per tenant
- Connection string passed to generated app via env vars

---

## Prompts

All prompts stored in `/prompts` folder for easy editing.

### discovery.md
System prompt for Claude during Discovery phase. Instructs Claude to:
- Ask clarifying questions about the app
- Cover: target users, core features, data model, workflows
- Summarize understanding and confirm

### research.md
Prompt for Gemini during Research phase. Instructs Gemini to:
- Analyze requirements
- Research best practices for this app type
- Design database schema
- Plan component structure
- Consider edge cases

### build.md
System prompt for Claude during Build phase. Instructs Claude to:
- Follow the technical plan exactly
- Use Next.js + Tailwind + shadcn/ui + Supabase
- Build step by step
- Report progress after each major step

### iterate.md
System prompt for Claude during Iterate phase. Instructs Claude to:
- Read existing codebase
- Make minimal changes to implement request
- Preserve existing functionality
- Update tests if applicable

---

## Security Considerations

### Authentication
- All API routes protected by Clerk middleware
- Users can only access their own projects
- Sandbox operations require project ownership verification

### Sandbox Isolation
- Each project runs in isolated Daytona container
- No cross-project communication
- Network policies enforced by Daytona

### Preview URLs
- URLs are unguessable (UUID-based)
- No authentication required (user can share if desired)
- URLs invalidated when sandbox destroyed

### Supabase Multi-tenancy
- Row-level security on all tables
- Tenant ID checked on every query
- No cross-tenant data access

### Input Validation
- User inputs sanitized before sending to AI
- Prompt injection mitigation in system prompts
- Command injection prevention in sandbox exec

---

## Error Handling (Requires Additional Planning)

**Known error scenarios:**
- Sandbox creation failure
- Claude Code installation failure
- Claude Code authentication failure
- Build step failure
- Supabase connection failure
- Preview server crash
- Sandbox timeout during build

**Mitigation strategies (to be detailed):**
- Retry logic with exponential backoff
- Graceful degradation
- User-facing error messages
- Recovery mechanisms
- Logging and alerting

---

## Non-Goals (Out of Scope for MVP)

- GitHub integration (push to repo)
- Custom domain for previews
- Team collaboration
- Version control / rollback
- Deployment to production
- Custom tech stack selection
- Mobile app generation
- API-only generation (no frontend)
- Billing / subscription management

---

## Success Metrics

- User can go from idea to working preview in < 10 minutes
- Preview loads successfully in 95% of builds
- 80% of users complete at least one iteration
- Average 3+ projects per active user
- < 5% build failure rate

---

## Open Questions (Requires Additional Planning)

1. **Ralph Loop Redesign** - How exactly should the iterative build loop work?
2. **Error Recovery** - Detailed error handling and retry strategies
3. **Prompt Engineering** - Exact prompts for each phase
4. **Supabase Multi-tenancy** - Exact implementation of tenant isolation
5. **Sandbox Wakeup** - How to restore state when waking sleeping sandbox
6. **Progress Summarization** - How to summarize Claude output for user

---

**Document Version:** 1.0
**Created:** 2026-01-23
**Author:** Sean + Claude

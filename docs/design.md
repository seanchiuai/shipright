# Shipright — Design Document

## Overview

UI design for Shipright MVP. User flow is linear: Landing → Clerk Sign-in → Interview → Match → Auto-build → Done.

---

## User Flow

```
Landing Page → Clerk Sign-in → Dashboard → New Project → Interview (3 steps) → Template Match → Auto-build → Success
```

After interview completes, everything is automatic until scaffolding is done.

---

## Page Layouts

### Landing Page

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                         [Logo] Shipright                           │
│                                                                    │
│              Describe your app. Get a production-ready             │
│                         codebase.                                  │
│                                                                    │
│                    [Sign in with Google]                           │
│                                                                    │
│              ─────────────────────────────────────                 │
│                                                                    │
│              How it works:                                         │
│              1. Describe → Tell us your app idea                   │
│              2. Match → We find the best template                  │
│              3. Build → Get a GitHub repo ready to go              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Your Projects                              [+ New Project]      │
│                                                                    │
│    ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│    │  Book Sharing    │  │  Task Manager    │  │  Recipe App    │  │
│    │                  │  │                  │  │                │  │
│    │  Created: Today  │  │  Created: 2d ago │  │  Created: 1w   │  │
│    │                  │  │                  │  │                │  │
│    │  [View on GitHub]│  │  [View on GitHub]│  │  [View on GitHub]│ │
│    └──────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │  Empty state: "No projects yet. Create your first one!"   │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Interview - Step 1 (App Idea)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Step 1 of 3                                                     │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                    │
│    What do you want to build?                                      │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │                                                            │  │
│    │  I want to build an app where...                          │  │
│    │                                                            │  │
│    │                                                            │  │
│    │                                                            │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                        450/500     │
│                                                                    │
│    Examples:                                                       │
│    • "...people can share and discover book recommendations"       │
│    • "...freelancers can track their time and invoices"           │
│                                                                    │
│                                              [Next →]              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Interview - Step 2 (AI Questions)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Step 2 of 3                                    Round 1 of 3     │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░   │
│                                                                    │
│    A few questions to understand your app better:                  │
│                                                                    │
│    1. Who will use this app?                                       │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │  [Text input]                                              │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│    2. Do users need to create accounts?                            │
│    ( ) No, anyone can use it                                       │
│    (•) Yes, with email/password                                    │
│    ( ) Yes, with Google login                                      │
│    ( ) Yes, with multiple options                                  │
│                                                                    │
│    3. What's the main thing users will do?                         │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │  [Text input]                                              │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                                    [← Back]     [Next →]           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Note: Step 2 uses chat-based UI with ChatMessage components, ChoiceGrid for selections, and MagicTextarea for text input. AI messages display as editorial flowing text (no bubble) with a dark avatar. User messages appear as dark stone-800 pills. Typewriter effect on unseen AI messages. Background uses warm paper gradient with SVG noise texture.

### Interview - Step 3 (Requirements Summary)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Step 3 of 3                                                     │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                    │
│    Here's what we understood. Edit anything that's wrong:          │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │  App Name: BookShare                              [Edit]   │  │
│    ├────────────────────────────────────────────────────────────┤  │
│    │  Problem: People want to share book recs          [Edit]   │  │
│    ├────────────────────────────────────────────────────────────┤  │
│    │  Users: Readers, Book clubs                       [Edit]   │  │
│    ├────────────────────────────────────────────────────────────┤  │
│    │  Auth: Google login                               [Edit]   │  │
│    ├────────────────────────────────────────────────────────────┤  │
│    │  Features:                                        [Edit]   │  │
│    │  • Add books to reading list                               │  │
│    │  • Share recommendations                                   │  │
│    │  • Follow other readers                                    │  │
│    ├────────────────────────────────────────────────────────────┤  │
│    │  Payments: None                                   [Edit]   │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                      [Start Over]     [Confirm & Build →]          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Building Progress (Autonomous)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                    Building your app...                            │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │                                                            │  │
│    │  ✓ Found matching template: SaaS Starter                   │  │
│    │  ✓ Connected to GitHub                                     │  │
│    │  ✓ Created repository: bookshare-app                       │  │
│    │  → Customizing for your requirements...                    │  │
│    │  ○ Generating project documentation                        │  │
│    │                                                            │  │
│    │  ████████████████████░░░░░░░░░░  65%                       │  │
│    │                                                            │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│    This usually takes 2-5 minutes. You can close this page        │
│    and we'll email you when it's ready.                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Success Page

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                         Your app is ready!                         │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │                                                            │  │
│    │  BookShare                                                 │  │
│    │  github.com/username/bookshare-app                         │  │
│    │                                                            │  │
│    │  Template: SaaS Starter                                    │  │
│    │  Stack: Next.js, Convex, Tailwind, shadcn/ui               │  │
│    │                                                            │  │
│    │  Files generated:                                          │  │
│    │  • CLAUDE.md - AI development guide                        │  │
│    │  • TASKS.md - Feature backlog                              │  │
│    │  • PRD.md - Product requirements                           │  │
│    │                                                            │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│         [View on GitHub]          [Back to Dashboard]              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### GitHub Connection (Before First Build)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo] Shipright                              [User Avatar ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Connect your GitHub account                                     │
│                                                                    │
│    We need access to create repositories for your projects.        │
│                                                                    │
│                    [Connect GitHub]                                │
│                                                                    │
│    We will:                                                        │
│    ✓ Create private repositories for your apps                     │
│    ✓ Commit code and documentation                                 │
│                                                                    │
│    We will NOT:                                                    │
│    ✗ Access your existing repositories                             │
│    ✗ Read your private code                                        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App
├── ClerkProvider + ConvexProvider
└── Router
    ├── / → LandingPage
    │   └── SignInButton (Clerk)
    ├── /dashboard → DashboardPage (protected)
    │   ├── Header
    │   ├── ProjectGrid
    │   │   └── ProjectCard (repeat)
    │   └── NewProjectButton
    ├── /interview/:projectId → InterviewPage (protected)
    │   ├── Header
    │   ├── ProgressBar
    │   ├── Step1AppIdea | Step2Questions | Step3Summary
    │   └── NavigationButtons
    ├── /building/:projectId → BuildingPage (protected)
    │   ├── Header
    │   ├── ProgressSteps
    │   └── ProgressBar
    ├── /success/:projectId → SuccessPage (protected)
    │   ├── Header
    │   ├── ProjectSummary
    │   └── ActionButtons
    └── /connect-github → GitHubConnectPage (protected)
        ├── Header
        └── ConnectButton
```

---

## Styling

### Design Tokens

```css
/* Colors - Warm editorial palette */
--background: #faf8f5;         /* Off-white */
--foreground: #1c1917;         /* Charcoal */
--secondary: #f3ede4;          /* Light beige */
--muted-foreground: #78716c;   /* Warm gray */
--border: #e2ddd5;             /* Soft tan */
--accent: #e8dfd3;             /* Warm cream */
--destructive: #dc2626;        /* Red */

/* Amber accent family */
--amber: #d97706;
--amber-light: #fbbf24;
--amber-dark: #b45309;
```

Interview UI uses Tailwind `stone-*` utilities directly (stone-50 through stone-900) for a cohesive warm palette. Backgrounds use warm paper gradients with SVG noise texture.

### Component Styling

Using shadcn/ui components with Tailwind. See ui-components skill for patterns.

---

## Responsive Behavior

### Desktop (> 1024px)
- Centered content, max-width container
- Full form layouts

### Tablet (768px - 1024px)
- Slightly narrower container
- Same layouts

### Mobile (< 768px)
- Full-width forms
- Stacked project cards
- Smaller text

---

## Loading States

- **Page loading**: Skeleton screens
- **Form submitting**: Button shows spinner, disabled
- **Building**: Progress steps with checkmarks

## Error States

- **Form errors**: Inline below input, red text
- **API errors**: Toast notification with retry option
- **Build failed**: Error message with "Try Again" button

---

## Incomplete / TBD

- [x] Step 2 interview UX - chat-based with ChatMessage, ChoiceGrid, MagicTextarea
- [ ] Edit modals for Step 3 summary
- [ ] Email notification design (when build completes)
- [ ] Settings page (disconnect GitHub, delete account)

---

**Document Version:** 2.0 (MVP rewrite)
**Updated:** 2026-01-25

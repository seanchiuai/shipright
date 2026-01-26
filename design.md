# Shipright — Design Document

## Overview

This document describes the system design and component architecture for Shipright.

---

## UI Layout

### Main Application Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER                                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [Logo] Shipright          [Projects ▼]    [User Avatar ▼]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────┬──────────────────────────────────┐   │
│  │     CHAT PANEL          │        PREVIEW PANEL             │   │
│  │     (40% width)         │        (60% width)               │   │
│  │                         │                                  │   │
│  │  ┌───────────────────┐  │  ┌────────────────────────────┐  │   │
│  │  │ Chat messages     │  │  │                            │  │   │
│  │  │ scrollable        │  │  │     Live Preview           │  │   │
│  │  │                   │  │  │     (iframe)               │  │   │
│  │  │                   │  │  │                            │  │   │
│  │  │                   │  │  │                            │  │   │
│  │  │                   │  │  │                            │  │   │
│  │  └───────────────────┘  │  │                            │  │   │
│  │                         │  │                            │  │   │
│  │  ┌───────────────────┐  │  └────────────────────────────┘  │   │
│  │  │ Status bar        │  │                                  │   │
│  │  │ Phase: Building   │  │  ┌────────────────────────────┐  │   │
│  │  └───────────────────┘  │  │ [Refresh] [Open] [Download]│  │   │
│  │                         │  └────────────────────────────┘  │   │
│  │  ┌───────────────────┐  │                                  │   │
│  │  │ [Type message...] │  │                                  │   │
│  │  └───────────────────┘  │                                  │   │
│  │                         │                                  │   │
│  └─────────────────────────┴──────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER                                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    Your Projects                              [+ New Project]      │
│                                                                    │
│    ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│    │  Book Sharing    │  │  Task Manager    │  │  Recipe App    │  │
│    │                  │  │                  │  │                │  │
│    │  Status: Ready   │  │  Status: Build   │  │  Status: Sleep │  │
│    │  Updated: 2h ago │  │  Updated: 5m ago │  │  Updated: 3d   │  │
│    │                  │  │                  │  │                │  │
│    │  [Open] [Delete] │  │  [Open] [Delete] │  │  [Wake][Delete]│  │
│    └──────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### New Project Modal

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│    What do you want to build?                                      │
│                                                                    │
│    ┌────────────────────────────────────────────────────────────┐  │
│    │                                                            │  │
│    │  I want to build an app where...                          │  │
│    │                                                            │  │
│    │                                                            │  │
│    └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│    Examples:                                                       │
│    • "...people can share and discover book recommendations"       │
│    • "...freelancers can track their time and invoices"           │
│    • "...friends can plan trips together"                         │
│                                                                    │
│                                    [Cancel]  [Start Building →]    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App
├── AuthProvider (Clerk)
├── ConvexProvider
└── Router
    ├── /login → LoginPage
    ├── /signup → SignupPage
    ├── /dashboard → DashboardPage
    │   ├── Header
    │   ├── ProjectGrid
    │   │   └── ProjectCard (repeat)
    │   └── NewProjectModal
    └── /project/:id → ProjectPage
        ├── Header
        ├── ChatPanel
        │   ├── MessageList
        │   │   └── Message (repeat)
        │   ├── StatusBar
        │   └── InputBox
        └── PreviewPanel
            ├── PreviewFrame (iframe)
            └── PreviewControls
```

---

## State Management

### Convex Queries

```typescript
// Get all projects for current user
useQuery(api.projects.list)

// Get single project
useQuery(api.projects.get, { projectId })

// Get messages for project
useQuery(api.messages.list, { projectId })

// Get build progress
useQuery(api.buildProgress.get, { projectId })
```

### Convex Mutations

```typescript
// Create new project
useMutation(api.projects.create)

// Update project status
useMutation(api.projects.updateStatus)

// Add message
useMutation(api.messages.create)

// Delete project
useMutation(api.projects.delete)
```

### Local State (React)

```typescript
interface LocalState {
  // UI state
  isNewProjectModalOpen: boolean
  isSidebarCollapsed: boolean

  // Input state
  messageInput: string

  // Loading states
  isSendingMessage: boolean
  isDownloading: boolean
}
```

---

## API Routes

### POST /api/projects
Create new project.

**Request:**
```json
{
  "idea": "I want to build an app where..."
}
```

**Response:**
```json
{
  "projectId": "abc123",
  "status": "discovery"
}
```

### POST /api/chat
Send message to project chat.

**Request:**
```json
{
  "projectId": "abc123",
  "message": "User's message"
}
```

**Response:**
```json
{
  "messageId": "msg123",
  "status": "processing"
}
```

### POST /api/sandbox/create
Create Daytona sandbox for project.

**Request:**
```json
{
  "projectId": "abc123"
}
```

**Response:**
```json
{
  "sandboxId": "dtn-xyz",
  "status": "creating"
}
```

### POST /api/sandbox/wake
Wake sleeping sandbox.

**Request:**
```json
{
  "projectId": "abc123"
}
```

**Response:**
```json
{
  "sandboxId": "dtn-xyz",
  "previewUrl": "https://..."
}
```

### GET /api/download/:projectId
Download project as zip.

**Response:** Binary zip file

---

## Real-time Updates

Convex provides real-time sync automatically. When data changes:

1. **Build progress updates:**
   - Claude completes a step
   - Server updates `buildProgress` in Convex
   - Frontend automatically receives update
   - UI shows new status

2. **Chat messages:**
   - Claude responds
   - Server adds message to Convex
   - Frontend automatically receives message
   - UI shows new message

3. **Preview URL:**
   - Dev server starts
   - Server updates project with previewUrl
   - Frontend receives update
   - UI loads preview iframe

---

## Styling

### Design Tokens

```css
/* Colors */
--color-primary: #6366f1;      /* Indigo */
--color-secondary: #8b5cf6;    /* Purple */
--color-success: #22c55e;      /* Green */
--color-warning: #f59e0b;      /* Amber */
--color-error: #ef4444;        /* Red */

--color-bg: #09090b;           /* Near black */
--color-surface: #18181b;      /* Dark gray */
--color-border: #27272a;       /* Gray border */

--color-text: #fafafa;         /* White */
--color-text-muted: #a1a1aa;   /* Gray text */

/* Spacing */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;

/* Radii */
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
```

### Component Examples

**Message Bubble (User):**
```
┌─────────────────────────────────────┐
│  I want to build an app where      │  bg: primary
│  people can share books            │  text: white
└─────────────────────────────────────┘  align: right
```

**Message Bubble (Assistant):**
```
┌─────────────────────────────────────┐
│  Great! Let me ask you a few       │  bg: surface
│  questions to understand better... │  text: white
└─────────────────────────────────────┘  align: left
```

**Status Bar:**
```
┌─────────────────────────────────────┐
│  ● Building                         │
│  Setting up authentication...       │  bg: surface
│  ████████░░░░░░░░  50%             │  border: border
└─────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (> 1024px)
- Side-by-side chat and preview
- Chat: 40%, Preview: 60%

### Tablet (768px - 1024px)
- Side-by-side but compressed
- Chat: 45%, Preview: 55%

### Mobile (< 768px)
- Stacked layout
- Toggle between chat and preview
- Bottom tabs: [Chat] [Preview]

---

## Loading States

### Project Loading
```
┌────────────────────────────────────┐
│                                    │
│        [Spinning loader]           │
│                                    │
│        Loading project...          │
│                                    │
└────────────────────────────────────┘
```

### Build In Progress
```
┌────────────────────────────────────┐
│  ● Building your app               │
│                                    │
│  ✓ Project initialized             │
│  ✓ Dependencies installed          │
│  → Setting up database...          │
│  ○ Creating pages                  │
│  ○ Starting preview                │
│                                    │
└────────────────────────────────────┘
```

### Sandbox Waking
```
┌────────────────────────────────────┐
│                                    │
│        [Spinning loader]           │
│                                    │
│        Waking up sandbox...        │
│        This takes ~30 seconds      │
│                                    │
└────────────────────────────────────┘
```

---

## Error States

### Build Failed
```
┌────────────────────────────────────┐
│  ✗ Build failed                    │
│                                    │
│  Something went wrong while        │
│  setting up your project.          │
│                                    │
│  [View Details]  [Try Again]       │
│                                    │
└────────────────────────────────────┘
```

### Sandbox Unavailable
```
┌────────────────────────────────────┐
│  Sandbox unavailable               │
│                                    │
│  Your project's environment has    │
│  expired. Click below to restart.  │
│                                    │
│  [Wake Sandbox]                    │
│                                    │
└────────────────────────────────────┘
```

---

## Accessibility

- All interactive elements have focus states
- Color contrast meets WCAG AA
- Screen reader labels on icons
- Keyboard navigation throughout
- Loading states announced to screen readers
- Error messages associated with inputs

---

**Document Version:** 1.0
**Created:** 2026-01-23

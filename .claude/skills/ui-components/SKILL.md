---
name: ui-components
description: UI patterns, shadcn/ui usage, and component guidelines
---

# UI Components

Patterns for building Shipright's UI with Next.js, Tailwind, and shadcn/ui.

## What is shadcn/ui?

shadcn/ui is **not a component library**. It's a collection of re-usable components that you copy into your app. Components become part of your codebase, giving you full control.

## Where It's Used in Shipright

- **Phase 1**: Landing page, auth UI (sign-in buttons), AppNavbar
- **Phase 2**: Interview forms, AI conversation UI (ai-message, ai-conversation)
- **Phase 3**: Template match results, selection UI
- **Phase 4**: Repository creation UI, connection status, GitHub integration
- **Dashboard**: Project cards with animated backgrounds, status badges
- **Profile**: User profile, avatar, GitHub connection management
- **All phases**: Buttons, cards, inputs, forms, badges, separators

## Installation

Initialize shadcn/ui (do once):

```bash
npx shadcn@latest init
```

Add components as needed:

```bash
npx shadcn@latest add button card input form label
```

## Key Components for Shipright

| Component | Use For | Install |
|-----------|---------|---------|
| `button` | Actions, CTAs | `npx shadcn@latest add button` |
| `card` | Project cards, containers | `npx shadcn@latest add card` |
| `input` | Text fields | `npx shadcn@latest add input` |
| `textarea` | Multi-line input | `npx shadcn@latest add textarea` |
| `label` | Form labels | `npx shadcn@latest add label` |
| `badge` | Status indicators, tags | `npx shadcn@latest add badge` |
| `avatar` | User profile images | `npx shadcn@latest add avatar` |
| `separator` | Visual dividers | `npx shadcn@latest add separator` |
| `progress` | Loading bars | `npx shadcn@latest add progress` |
| `ai-message` | AI/user chat bubbles | Custom in `components/ui/` |
| `ai-conversation` | Chat container | Custom in `components/ui/` |

## Component Organization

```
components/
├── ui/              # shadcn/ui (auto-generated) + custom (ai-message, ai-conversation, loading-spinner)
├── interview/       # Interview-specific (chat-message, choice-card, magic-textarea, loading-dots, requirements-summary, interview-input-area, etc.)
├── dashboard/       # Dashboard-specific (project-card, status-badge, empty-state, loading-skeleton, dashboard-background, stagger-container)
├── landing/         # Landing page (hero-section, aurora-background, scroll-explainer)
└── app-navbar.tsx   # Global navigation component
```

## Styling Approach

Use Tailwind utilities, avoid custom CSS:

```tsx
// ✅ Good
<div className="flex items-center gap-4 p-6 bg-card rounded-lg border">

// ❌ Avoid
<div style={{ display: 'flex' }}>
```

## Reference Files

- [reference.md](reference.md) - Component examples, patterns, detailed usage

## External Documentation

- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- Use Context7 MCP for current component docs

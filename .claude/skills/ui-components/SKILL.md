---
name: ui-components
description: UI patterns, shadcn/ui usage, and component guidelines
---

# UI Components

Patterns for building Shipright's UI with Next.js, Tailwind, and shadcn/ui.

## What is shadcn/ui?

shadcn/ui is **not a component library**. It's a collection of re-usable components that you copy into your app. Components become part of your codebase, giving you full control.

## Where It's Used in Shipright

- **Phase 1**: Landing page, auth UI (sign-in buttons)
- **Phase 2**: Interview forms, question cards
- **Phase 3**: Template match results, selection UI
- **Phase 4**: Repository creation UI, connection status
- **All phases**: Buttons, cards, inputs, forms

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
| `form` | Interview forms | `npx shadcn@latest add form` |
| `label` | Form labels | `npx shadcn@latest add label` |

## Component Organization

```
components/
├── ui/              # shadcn/ui (auto-generated)
├── interview/       # Interview-specific
├── dashboard/       # Dashboard components
└── shared/          # Reusable components
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

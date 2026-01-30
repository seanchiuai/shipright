# Shipright — Design Document

## Overview

UI design for Shipright MVP. User flow is linear: Landing → Clerk Sign-in → Interview → Match → Auto-build → Done.

---

## Design Identity

**One-liner:** Warm editorial minimalism — a thoughtful publication, not a SaaS dashboard.

Shipright should feel like sitting in a well-lit room with a notebook. The interface recedes so the user's idea stays front and center. Every surface evokes paper, ink, and natural warmth. Nothing blinks for attention. Nothing feels "techy." The product earns trust through restraint.

### Mood References

- The typography of Stripe's blog
- The warmth of a Kinfolk magazine spread
- The calm density of Linear's UI
- The conversational ease of ChatGPT's input area

### Core Principles

1. **Content over chrome.** The user's words are the main character. UI elements exist to frame them, never compete.
2. **Warmth over sterility.** Cream backgrounds, serif headlines, soft shadows. Cold grays and electric blues are banned.
3. **Calm motion.** Animation serves comprehension (entrance reveals, loading feedback). Never decorative wobble or bounce.
4. **Earned density.** Start sparse. Add detail only when the user progresses deeper (landing → dashboard → interview).
5. **One focal point per screen.** Each page has exactly one primary action. Secondary actions are visually quieter.

### Personality Attributes

| Attribute | Yes | No |
|-----------|-----|-----|
| Tone | Confident, direct, concise | Hype-y, exclamatory, corporate |
| Type | Serif headlines, clean sans body | All-caps headings, decorative fonts |
| Color | Warm neutrals, amber accents | Neon, saturated primaries, gradients-as-decoration |
| Spacing | Generous, breathable | Cramped, "above the fold" packing |
| Borders | Thin, warm-tinted (`stone-200`) | Thick, cold gray, double borders |
| Shadows | Barely-there, warm-shifted | Drop shadows, hard edges |
| Corners | Soft (`rounded-xl` to `rounded-2xl`) | Sharp 0px or extreme pill on rectangles |
| Icons | Lucide, 1px stroke, stone-500 | Filled icons, colored icons, emoji |

---

## Design Rules

These are non-negotiable constraints for any new UI work.

### Color

- Background is always `#faf8f5` (warm off-white) or `white` for elevated cards. Never `gray-50`, `slate-50`, or pure `#f5f5f5`.
- Text is `stone-900` for headings, `stone-700` for body, `stone-500` for secondary/muted. Never `gray-*` or `zinc-*`.
- The only accent color is amber (`#d97706` family). Use it for progress indicators, active states, and CTAs that need emphasis — sparingly.
- Destructive actions use `red-600`. No other reds.
- Status colors: amber = in progress, green = complete, blue = building, purple = matching. These appear only in badges/indicators, never as page-level color.

### Typography

- **Headlines:** Instrument Serif, 400 weight. Tight tracking (`tracking-tight`). Used for page titles and hero text only.
- **Body:** Instrument Sans, 400-500 weight. 15px base with `leading-[1.7]`. Subtle negative tracking (`tracking-[-0.01em]`).
- **Labels/Caps:** Instrument Sans, 11px, `uppercase tracking-wider`, `stone-500`. For metadata, step indicators, timestamps.
- **Mono:** JetBrains Mono for any code or technical strings.
- Never use font weights above 600. Hierarchy comes from size and serif/sans contrast, not boldness.
- Max line width: ~65 characters for body text. Use `max-w-2xl` or `max-w-3xl` for content columns.

### Spacing

- Sections separated by `py-24` minimum on desktop. The page should breathe.
- Card internal padding: `p-6`. Never less than `p-4`.
- Related elements: `gap-2` to `gap-4`. Unrelated groups: `gap-8` or more.
- The interview chat uses `gap-8` between messages to give each thought room.

### Borders & Surfaces

- Card borders: `border border-stone-200`. One pixel, warm-tinted. Never `border-gray-200`.
- Card radius: `rounded-xl` (12px) to `rounded-2xl` (16px). Consistency matters more than variety.
- Shadows: `shadow-sm` only. On hover, allow `shadow-md` with warm shift. Never `shadow-lg` or `shadow-xl`.
- Input radius: `rounded-2xl`. Focus state adds a soft glow: `shadow-[0_0_0_3px_rgba(28,25,23,0.06)]`.
- Glassmorphism (backdrop-blur + transparency) is reserved for fixed navbars and the chat input bar. Not for cards.

### Motion

- Default duration: 300ms. Max: 500ms. Anything longer feels sluggish.
- Easing: `[0.25, 0.46, 0.45, 0.94]` — smooth deceleration, editorial feel.
- Entrance pattern: fade in + translate Y (8-20px). Stagger 40-100ms per item.
- Hover: subtle `scale(0.985)` press or `-translate-y-1` lift. Never both.
- The typewriter effect (30ms/char) is exclusive to AI chat messages. Do not use elsewhere.
- Always respect `prefers-reduced-motion`. All animations collapse to instant.

### Texture & Depth

- Backgrounds use a multi-stop warm gradient: `linear-gradient(168deg, hsl(40,22%,97%) 0%, hsl(35,16%,95%) 40%, hsl(30,14%,94%) 100%)`.
- SVG fractal noise overlay at `opacity-[0.025]` gives a paper-grain feel. Present on all full-page backgrounds.
- Ambient gradient orbs (blurred radial circles) add atmospheric depth on landing/dashboard. Keep them slow (8-15s animation), desaturated, and below content.
- These textures are subtle. If you can describe them without looking hard, they're too strong.

### Chat / Conversational UI

- AI messages: no bubble. Text flows editorially at 15px/1.7 line-height. Dark 28px avatar circle.
- User messages: dark pill (`bg-stone-800 text-stone-50`), `rounded-2xl rounded-br-md` (one sharp corner to indicate direction).
- Choice cards: white bg, `rounded-xl`, 18px circular checkbox. Selected state = dark border + shadow + subtle bg tint.
- Input bar: fixed bottom, `bg-white/50 backdrop-blur-xl`, circular submit button.
- "Something else" always available as an escape hatch from choices to free text.

### Do Not

- Add gradients to buttons or cards (flat color only).
- Use colored backgrounds for sections (stick to off-white/white).
- Put more than one primary CTA per screen.
- Use toast notifications for success — use inline confirmation or page transition.
- Add hover tooltips — if something needs explanation, the label should be clearer.
- Use skeleton loaders that don't match the final layout shape.
- Introduce new colors without updating this document.

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
│                      [Start Over]     [Find My Template →]          │
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

**Document Version:** 3.0 (added design identity, principles, rules)
**Updated:** 2026-01-29

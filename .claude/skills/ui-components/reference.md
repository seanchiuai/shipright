# UI Components Reference

Detailed component usage, examples, and patterns for Shipright's UI.

## Installation

```bash
# Initialize shadcn/ui (once)
npx shadcn@latest init

# Core components currently in use
npx shadcn@latest add button card input label textarea badge separator avatar progress radio-group dropdown-menu accordion

# Note: ai-message and ai-conversation are custom components in components/ui/
```

## File Structure

```
components/
├── ui/                         # shadcn/ui (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── textarea.tsx
│   ├── badge.tsx
│   ├── separator.tsx
│   ├── avatar.tsx
│   ├── progress.tsx
│   ├── radio-group.tsx
│   ├── dropdown-menu.tsx
│   ├── accordion.tsx
│   ├── ai-message.tsx          # AI: editorial flowing text; User: dark pill bubble
│   └── ai-conversation.tsx     # Auto-scroll container (gap-8 spacing)
├── interview/                  # Interview-specific
│   ├── chat-message.tsx        # AI/user message wrapper
│   ├── typewriter-text.tsx     # Typewriter effect
│   ├── choice-card.tsx         # Choice selection UI
│   ├── magic-textarea.tsx      # Animated text input
│   ├── journey-progress.tsx    # Progress indicator
│   ├── loading-dots.tsx        # Bouncing dots for AI loading
│   ├── requirements-summary.tsx # Editable requirements (summary phase)
│   ├── interview-input-area.tsx # Bottom input area
│   └── interview-background.tsx # Dark gradient background with animations
├── dashboard/                  # Dashboard-specific
│   ├── project-card.tsx        # Project card with hover glow + context menu
│   ├── status-badge.tsx        # Color-coded status with pulse animation
│   ├── dashboard-background.tsx # Dark gradient + particles + grid
│   ├── stagger-container.tsx   # Framer-motion stagger animations
│   ├── empty-state.tsx         # Empty dashboard state
│   └── loading-skeleton.tsx    # Dashboard loading skeleton
├── landing/                    # Landing page
│   ├── hero-section.tsx        # Hero with CTA
│   ├── aurora-background.tsx   # Aurora light effect
│   ├── scroll-explainer.tsx    # Scroll-based animated explainer
│   └── index.ts               # Barrel exports
└── app-navbar.tsx              # Global navbar with auth and navigation

app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles and design tokens (dark theme)
├── dashboard/
│   └── page.tsx                # Dashboard (uses extracted components)
├── interview/
│   └── [id]/page.tsx           # Interview flow
├── project/
│   └── [id]/page.tsx           # Project detail page
├── connect-github/
│   └── page.tsx                # GitHub OAuth connection
└── profile/
    └── page.tsx                # Profile management with GitHub connection
```

## Button Component

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// As link
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

## Card Component

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProjectCard({ name, status, repoUrl }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>Status: {status}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Project details...</p>
      </CardContent>
      {repoUrl && (
        <CardFooter>
          <Button variant="outline" asChild>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              View Repository
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

## Form with react-hook-form + zod

Install dependencies:

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form
```

Usage:

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  appIdea: z.string().min(10, "Minimum 10 characters").max(500),
  appName: z.string().min(3).max(50),
});

type FormValues = z.infer<typeof formSchema>;

export function IdeaForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appIdea: "",
      appName: "",
    },
  });

  function onSubmit(values: FormValues) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="appName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Name</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome App" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appIdea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe your app idea</FormLabel>
              <FormControl>
                <Input placeholder="I want to build..." {...field} />
              </FormControl>
              <FormDescription>
                Tell us what you want to build
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Next</Button>
      </form>
    </Form>
  );
}
```

## Input & Label

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailField() {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
      />
    </div>
  );
}
```

## Complete Login Example

```tsx
"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <a href="#" className="text-sm text-muted-foreground hover:underline">
              Forgot your password?
            </a>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full">Login</Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Tailwind Styling Patterns

### Common Patterns

```tsx
// Layout
<div className="flex items-center gap-4">
<div className="grid grid-cols-3 gap-6">
<div className="space-y-4"> {/* Stack with gap */}

// Spacing
<div className="p-6 px-4 py-2">  {/* padding */}
<div className="m-4 mx-auto">    {/* margin */}

// Colors (use theme variables)
<div className="bg-card text-card-foreground border-border">
<Button className="bg-primary text-primary-foreground">

// Typography
<h1 className="text-2xl font-semibold">
<p className="text-sm text-muted-foreground">

// Effects
<div className="rounded-lg shadow-md hover:bg-accent">
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>

<Button className="w-full md:w-auto">
  {/* Full width mobile, auto desktop */}
</Button>
```

## Theme Colors

shadcn/ui uses CSS variables:

- `background` - Page background
- `foreground` - Default text
- `card` - Card backgrounds
- `primary` - Primary actions
- `secondary` - Secondary actions
- `muted` - Muted/disabled
- `accent` - Accent elements
- `destructive` - Destructive actions
- `border` - Border color

Usage:
```tsx
<div className="bg-card text-card-foreground border border-border">
  <Button className="bg-primary text-primary-foreground">Submit</Button>
</div>
```

## Shipright-Specific Components

### AppNavbar

```tsx
// components/app-navbar.tsx
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppNavbar({ title }: { title?: string }) {
  const router = useRouter();
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
          <Image src="/logo.png" alt="ShipRight" width={32} height={32} />
          <span className="font-serif text-xl font-medium">ShipRight</span>
        </button>
        {title && <span className="hidden sm:block text-sm text-muted-foreground">{title}</span>}
        <Link href="/profile">
          <Avatar className="ring-2 ring-border hover:ring-primary/50 transition-all">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>{/* initials */}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
```

### Project Card (Dashboard)

Extracted component at `src/components/dashboard/project-card.tsx`:
- **Glow hover effect** — gradient border (`from-primary/20 to-purple-500/20`) appears on hover
- **Status badges** with glow effects via `StatusBadge` component
- **Context menu** — rename/delete via `DropdownMenu` (visible on hover)
- **GitHub repo link** when available
- **Template name** display with Package icon
- Uses framer-motion `staggerItem` variants

```tsx
import { ProjectCard } from "@/components/dashboard/project-card";

<ProjectCard
  project={{
    _id: "...",
    name: "My App",
    status: "matched",
    scaffoldingStatus: undefined,
    appIdea: "A marketplace for...",
    githubRepoUrl: "https://github.com/...",
    templateName: "Next.js + Convex",
    _creationTime: Date.now()
  }}
  onClick={() => router.push(`/project/${project._id}`)}
  onRename={() => handleRename(project._id)}
  onDelete={() => handleDelete(project._id)}
/>
```

### Status Badge

Extracted component at `src/components/dashboard/status-badge.tsx`:
- Color-coded by status: amber (interview), purple (matching), blue (creating repo), indigo (scaffolding), green (complete), red (failed)
- Animated pulse dot + glow shadow
- Handles `scaffoldingStatus === "scaffolding_failed"` → shows as failed

```tsx
import { StatusBadge } from "@/components/dashboard/status-badge";

<StatusBadge status={project.status} scaffoldingStatus={project.scaffoldingStatus} />
```

### Dashboard Animated Background

The dashboard uses a dedicated `DashboardBackground` component (`src/components/dashboard/dashboard-background.tsx`):

```tsx
import { DashboardBackground } from "@/components/dashboard/dashboard-background";

<DashboardBackground />

// Layers (fixed positioning):
// -z-30: Gradient base (#06080d → #0a0f1a → #0d1117)
// -z-20: Animated grid overlay with blue accents (60px × 60px)
// -z-10: Gradient orbs (blue + purple) + particle canvas
```

Particles use HSL colors in the blue range (hue: 210-250) with low opacity. Connected lines drawn when proximity < 80px. All animations use requestAnimationFrame with cleanup.

### Profile Page Components

The profile page (`/src/app/profile/page.tsx`) showcases several component patterns:

```tsx
// Profile card with avatar and user info
<Card>
  <CardHeader>
    <CardTitle className="font-serif text-xl">Profile</CardTitle>
    <CardDescription>Your account information</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={user.imageUrl} />
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-lg font-medium">{user.fullName}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  </CardContent>
</Card>

// GitHub connection card with status badge
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="font-serif text-xl flex items-center gap-2">
        <Github className="h-5 w-5" />
        GitHub
      </CardTitle>
      {isConnected && (
        <Badge variant="secondary" className="bg-green-50 text-green-700">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )}
    </div>
  </CardHeader>
</Card>

// Sign out button with separator
<Separator />
<Button variant="outline" className="w-full gap-2 text-destructive">
  <LogOut className="h-4 w-4" />
  Sign out
</Button>
```

### Project Detail Page Components

The project detail page (`/src/app/project/[id]/page.tsx`) shows:
- **Loading states** with Loader2 spinner
- **Error cards** with AlertCircle icon
- **Progress indicators** for matching/building states
- **Template info** cards with Package icon and match score badges
- **Dynamic status labels** with color-coded badges

## Design Principles

### Core Palette
- **Dark Theme** — Background `#06080d`, card `#080b14`, foreground `#e8eaed`
- **Blue Accents** — Primary `#3b82f6`, light `#60a5fa`, dark `#2563eb`
- **Status Colors** — Amber (in-progress), purple (matching), blue (creating), green (complete), red (failed)
- **Subtle Borders** — `rgba(255, 255, 255, 0.06)` for borders/inputs

### Typography
- **Font Families** - `font-serif` (Instrument Serif) for headings, `font-sans` (Instrument Sans) for body
- **Precise Sizing** - Explicit sizes like `text-[15px]`, `text-[13px]`, `text-[12px]`, `text-[11px]`
- **Line Height** - Use `leading-[1.7]` for AI messages, `leading-[1.6]` for user messages
- **Tracking** - Subtle negative tracking `tracking-[-0.01em]` for refined text

### Visual Effects
- **Frosted Glass Headers** - `backdrop-blur-md bg-background/70` for AppNavbar
- **Hover States** - Gradient glows with `opacity-0 group-hover:opacity-100` transitions
- **Subtle Shadows** - `shadow-[0_2px_12px_rgba(0,0,0,0.06)]` for focus states
- **Animated Backgrounds** - Dashboard uses gradient background, particle canvas, and floating orbs
- **AI Messages** - No bubble for AI (editorial flowing text with dark avatar), dark pill for user messages
- **Paper Texture** - SVG noise texture overlay at very low opacity for tactile depth in interview

### Layout Patterns
- **Consistent Spacing** - Use Tailwind spacing scale (4, 8, 16, 24)
- **Max Width Containers** - `max-w-6xl` for dashboard, `max-w-5xl` for projects, `max-w-2xl` for profile
- **Accessible** - shadcn/ui built on Radix UI (accessible by default)
- **Desktop-first for MVP** - Mobile-responsive but optimize for desktop
- **Status Badges** - Color-coded with glow effects using custom shadow values

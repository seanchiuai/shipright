# UI Components Reference

Detailed component usage, examples, and patterns for Shipright's UI.

## Installation

```bash
# Initialize shadcn/ui (once)
npx shadcn@latest init

# Add components
npx shadcn@latest add button card input form label textarea select dialog badge separator
```

## File Structure

```
components/
├── ui/                         # shadcn/ui (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── ai-message.tsx          # Chat message bubble (accepts userImageUrl prop)
│   └── ai-conversation.tsx     # Auto-scroll container
├── interview/                  # Interview-specific
│   ├── chat-message.tsx        # AI/user message wrapper
│   ├── typewriter-text.tsx     # Typewriter effect
│   ├── choice-card.tsx         # Choice selection UI
│   ├── magic-textarea.tsx      # Animated text input
│   ├── celebration.tsx         # Confetti + toast
│   ├── journey-progress.tsx    # Progress indicator
│   └── interview-background.tsx # Ambient animation
└── dashboard/                  # Dashboard components
    └── project-card.tsx

app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── dashboard/
│   └── page.tsx                # Dashboard
├── interview/
│   └── [id]/page.tsx           # Interview flow
└── project/
    └── [id]/page.tsx           # Project detail
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

### Project Card

```tsx
// components/dashboard/project-card.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  name: string;
  status: "interview" | "matching" | "building" | "complete";
  repoUrl?: string;
}

const statusColors = {
  interview: "bg-blue-500",
  matching: "bg-yellow-500",
  building: "bg-orange-500",
  complete: "bg-green-500",
};

export function ProjectCard({ name, status, repoUrl }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <Badge className={statusColors[status]}>{status}</Badge>
        </div>
        <CardDescription>Created just now</CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm">Continue</Button>
        {repoUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              View Repo
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

### Interview Question Card

```tsx
// components/interview/question-card.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuestionCardProps {
  question: string;
  id: string;
  required: boolean;
}

export function QuestionCard({ question, id, required }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-normal">
          {question}
          {required && <span className="text-destructive ml-1">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input id={id} placeholder="Your answer..." />
      </CardContent>
    </Card>
  );
}
```

## Design Principles

- **Warm Editorial Palette** - Cream backgrounds (`#faf8f5`), warm borders (`#e2ddd5`), dark foreground (`#1c1917`)
- **Typography** - `font-serif` (Instrument Serif) for headings, `font-sans` (Instrument Sans) for body
- **Clean & Minimal** - Focus on clarity, no flashy gradients in interactive areas
- **Consistent Spacing** - Use Tailwind spacing scale (4, 8, 16, 24)
- **Accessible** - shadcn/ui built on Radix UI (accessible by default)
- **Desktop-first for MVP** - Mobile-responsive but optimize for desktop
- **Frosted Glass Headers** - `backdrop-blur-md bg-background/80` for sticky headers
- **Dark CTAs** - Primary buttons use `bg-foreground text-background` style
- **Subtle Focus States** - `shadow-[0_0_0_3px_rgba(28,25,23,0.06)]` instead of bright rings

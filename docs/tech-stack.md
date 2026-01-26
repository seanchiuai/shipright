# Shipright — Tech Stack

## Overview

This document details all technologies used in Shipright, both for the builder platform itself and for the apps it generates.

---

## Shipright (The Builder Platform)

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ (App Router) | React framework, routing, API routes |
| React | 18+ | UI components |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3.4+ | Utility-first styling |
| shadcn/ui | latest | Pre-built accessible components |

### Authentication

| Technology | Purpose |
|------------|---------|
| Clerk | User authentication, OAuth, session management |

### Database

| Technology | Purpose |
|------------|---------|
| Convex | Real-time database for Shipright's data |

### AI Services

| Technology | Model | Purpose |
|------------|-------|---------|
| Claude Code | claude-sonnet-4-5-20250929 | Discovery phase, Build phase, Iterate phase |
| Gemini API | gemini-3-pro-preview | Research phase |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Daytona | Sandboxed environments for running Claude Code |
| Vercel | Hosting for Shipright web app |

---

## Generated Apps (What Users Build)

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ (App Router) | React framework |
| React | 18+ | UI components |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3.4+ | Styling |
| shadcn/ui | latest | Component library |

### Backend

| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Server-side logic |
| Supabase Edge Functions | (if needed) Serverless functions |

### Database

| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Database for generated apps |
| Supabase Auth | Authentication for generated apps |

### Deployment

| Technology | Purpose |
|------------|---------|
| Vercel | (recommended) Production hosting |

---

## NPM Dependencies — Shipright

### Production

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@clerk/nextjs": "^5.0.0",
    "convex": "^1.0.0",
    "@anthropic-ai/sdk": "^0.34.0",
    "@google/generative-ai": "^0.21.0",
    "@daytonaio/sdk": "^1.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "archiver": "^7.0.0",
    "zod": "^3.23.0"
  }
}
```

### Development

```json
{
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/archiver": "^6.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

---

## NPM Dependencies — Generated Apps

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

---

## Environment Variables — Shipright

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Daytona
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io

# Claude Code (for sandbox injection)
CLAUDE_CODE_OAUTH_TOKEN=...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Gemini
GOOGLE_AI_API_KEY=...

# Supabase (shared instance for generated apps)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Environment Variables — Generated Apps

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Tenant ID (for multi-tenancy)
TENANT_ID=project_abc123
```

---

## API Integrations

### Clerk

```typescript
// Middleware (middleware.ts)
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();

// Get user in API route
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
```

### Convex

```typescript
// Provider (app/providers.tsx)
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Query
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
const projects = useQuery(api.projects.list);

// Mutation
import { useMutation } from "convex/react";
const createProject = useMutation(api.projects.create);
```

### Daytona SDK

```typescript
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
});

// Create sandbox
const sandbox = await daytona.create({
  language: "typescript",
  envVars: {
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    TENANT_ID: projectId,
  },
  autoStopInterval: 10, // minutes
});

// Execute command
await daytona.exec(sandbox.id, "npm install", { stream: true });

// Get preview URL
const previewUrl = await daytona.getPreviewUrl(sandbox.id, 3000);

// Destroy sandbox
await daytona.destroy(sandbox.id);
```

### Claude Code (in Sandbox)

```bash
# Install
curl -fsSL https://cli.claude.com/install.sh | bash

# Run with prompt
claude "[system prompt + user request]" --dangerously-skip-permissions

# Resume session (for iterations)
claude --resume "[follow-up request]"
```

### Gemini API

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
});

const plan = result.response.text();
```

### Supabase (for Generated Apps)

```typescript
import { createClient } from "@supabase/supabase-js";

// Service client (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Create tables for tenant
await supabase.rpc("create_tenant_tables", { tenant_id: projectId });

// Query with tenant filter
const { data } = await supabase
  .from("items")
  .select("*")
  .eq("tenant_id", projectId);
```

---

## File Structure — Shipright

```
shipright/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing / redirect to dashboard
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── project/
│   │   └── [id]/page.tsx
│   └── api/
│       ├── projects/route.ts
│       ├── chat/route.ts
│       ├── sandbox/
│       │   ├── create/route.ts
│       │   └── wake/route.ts
│       └── download/[id]/route.ts
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── chat-panel.tsx
│   ├── preview-panel.tsx
│   ├── project-card.tsx
│   ├── new-project-modal.tsx
│   └── status-bar.tsx
├── convex/
│   ├── schema.ts
│   ├── projects.ts
│   ├── messages.ts
│   └── buildProgress.ts
├── lib/
│   ├── daytona.ts                  # Daytona SDK wrapper
│   ├── gemini.ts                   # Gemini API wrapper
│   ├── claude.ts                   # Claude execution helpers
│   └── supabase-admin.ts           # Supabase service client
├── prompts/
│   ├── discovery.md
│   ├── research.md
│   ├── build.md
│   └── iterate.md
├── public/
├── middleware.ts                    # Clerk auth middleware
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## File Structure — Generated Apps

```
generated-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       └── [feature]/route.ts
├── components/
│   ├── ui/                         # shadcn/ui components
│   └── [feature-components].tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts
├── public/
├── .env.local                       # Supabase credentials
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md                        # Setup instructions
```

---

## Deployment

### Shipright

```bash
# Deploy to Vercel
vercel deploy --prod

# Environment variables set in Vercel dashboard
```

### Generated Apps (User's Responsibility)

```bash
# User downloads zip
# Extracts locally
cd my-app
npm install
npm run dev

# Deploy to Vercel (optional)
vercel deploy
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Clerk account
- Convex account
- Daytona account
- Google AI API key
- Anthropic API key (or Claude Code OAuth token)
- Supabase account

### Local Development

```bash
# Clone repo
git clone https://github.com/seanchiuai/shipright.git
cd shipright

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run Convex dev server
npx convex dev

# Run Next.js dev server (separate terminal)
npm run dev
```

---

**Document Version:** 1.0
**Created:** 2026-01-23

# Shipright — Tech Stack

## Overview

Technologies used in Shipright (the builder platform). Generated apps use whatever stack their template provides.

---

## Shipright Platform

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ (App Router) | React framework, routing |
| React | 18+ | UI components |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3.4+ | Utility-first styling |
| shadcn/ui | latest | Pre-built accessible components |

### Backend & Database

| Technology | Purpose |
|------------|---------|
| Convex | Real-time database, serverless functions |
| Convex Auth | Authentication with Google OAuth |

### AI Services

| Technology | Model | Purpose |
|------------|-------|---------|
| Claude API | claude-sonnet-4-5-20250929 | Interview questions, requirements extraction |

### External APIs

| Technology | Purpose |
|------------|---------|
| GitHub API | OAuth, repo creation, commits |
| Daytona SDK | Sandboxed environments for template customization |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Vercel | Production hosting |

---

## NPM Dependencies

### Production

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "convex": "^1.0.0",
    "@convex-dev/auth": "^0.1.0",
    "@anthropic-ai/sdk": "^0.34.0",
    "@daytonaio/sdk": "^1.0.0",
    "octokit": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
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
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

---

## Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Google OAuth (for Convex Auth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Daytona
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://api.daytona.io
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Convex account
- Google Cloud project (for OAuth)
- GitHub OAuth app
- Anthropic API key
- Daytona account

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

# Run Convex dev server (terminal 1)
npx convex dev

# Run Next.js dev server (terminal 2)
npm run dev
```

---

## Generated Apps

Generated apps use whatever stack their matched template provides. Templates vary:

- Some use Convex, some use Supabase, some use Prisma
- Some use Clerk, some use NextAuth, some use Convex Auth
- All templates are public GitHub repos

Shipright doesn't dictate the generated app's stack - it matches users to appropriate templates based on their requirements.

---

**Document Version:** 2.0 (MVP update)
**Updated:** 2026-01-25

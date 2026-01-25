# Shipright v2 — AI-Powered App Foundation Builder

## Overview
Web app that turns ideas into working MVPs through AI-guided discovery and autonomous building with Claude Code in Daytona sandboxes.

## Location
**Path:** `/Users/seanchiu/Desktop/shipright`

## Architecture

**Phases:**
1. **Discovery** (Interactive) - Claude asks clarifying questions about the app idea
2. **Research** (Autonomous) - Gemini researches best practices and plans architecture
3. **Build** (Autonomous) - Claude Code builds the app in a Daytona sandbox
4. **Iterate** (User-triggered) - User requests changes via chat

**System Flow:**
```
User submits idea → Discovery chat → Research plan → Create sandbox →
Claude Code builds → Live preview → User iterates → Download zip
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind, shadcn/ui |
| Auth | Clerk |
| Database | Convex (real-time) |
| Sandboxes | Daytona SDK |
| AI - Discovery/Build | Claude Code |
| AI - Research | Gemini API |
| Generated Apps DB | Supabase (multi-tenant) |
| Hosting | Vercel |

## Project Structure

```
shipright/
├── app/                    # Next.js pages
│   ├── (auth)/            # Login/signup
│   ├── dashboard/         # Project list
│   ├── project/[id]/      # Workspace (chat + preview)
│   └── api/               # API routes
├── components/ui/          # shadcn/ui components
├── convex/                 # Database schema & functions
├── lib/                    # SDK wrappers
│   ├── daytona.ts         # Sandbox management
│   ├── gemini.ts          # Research API
│   ├── claude.ts          # Claude Code execution
│   └── supabase-admin.ts  # Generated app DB admin
└── prompts/                # System prompts for each phase
```

## Status
- Scaffold complete (2026-01-24)
- Needs: npm install, Convex setup, env vars, then can start building features

## Next Steps
1. Set up Clerk project and add keys
2. Set up Convex project (`npx convex dev`)
3. Get Daytona API key
4. Build the project workspace UI (chat panel + preview panel)
5. Implement Discovery phase API route
6. Implement Research phase
7. Implement Build phase with sandbox creation

## Related Docs
- PRD: `/os/projects/shipright/prd.md`
- Tech Stack: `/os/projects/shipright/tech-stack.md`
- Archived v1: `/Users/seanchiu/Desktop/shipright-archived`

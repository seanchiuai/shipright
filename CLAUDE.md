# Shipright v2

AI-powered app foundation builder. Turn ideas into working MVPs through AI-guided discovery and autonomous building with Claude Code + Daytona sandboxes.

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # Build for production
npm run typecheck  # Type check
npm run lint       # Lint
```

## Architecture

**Phases:**
1. **Discovery** (Interactive) - Claude asks clarifying questions
2. **Research** (Autonomous) - Gemini researches best practices
3. **Build** (Autonomous) - Claude Code builds in Daytona sandbox
4. **Iterate** (User-triggered) - User requests changes

**Stack:**
- Next.js 14 (App Router)
- Clerk (auth)
- Convex (real-time database)
- Daytona (sandboxed environments)
- Claude Code (discovery, build, iterate)
- Gemini API (research phase)
- Supabase (generated app databases)

## Project Structure

```
app/
  (auth)/           # Login/signup pages
  dashboard/        # Project list
  project/[id]/     # Project workspace (chat + preview)
  api/              # API routes
components/
  ui/               # shadcn/ui components
convex/             # Convex schema and functions
lib/                # SDK wrappers (daytona, gemini, claude)
prompts/            # System prompts for each phase
```

## Key Files

- `convex/schema.ts` - Database schema (projects, messages, buildProgress)
- `lib/daytona.ts` - Daytona SDK wrapper
- `lib/gemini.ts` - Gemini API wrapper
- `prompts/*.md` - System prompts for AI phases

## Conventions

- Use Convex for all database operations (real-time sync)
- Each project gets its own Daytona sandbox
- Sandbox sleeps after 10min inactivity, wakes on project open
- Preview URLs are public but unguessable (UUID-based)
- Generated apps use Supabase with multi-tenant schema

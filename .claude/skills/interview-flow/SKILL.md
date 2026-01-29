---
name: interview-flow
description: AI-guided conversational interview for extracting app requirements
---

# Interview Flow

AI-guided conversational interview that extracts structured requirements from user's app idea.

## Where It Fits

**Phase 2**: After authentication, before template matching.

## The Flow

1. **Seed Phase** - User describes app idea (500 char max) or clicks example chip
2. **Conversation Phase** - AI asks one question at a time, dynamically picking question type
3. **Summary Phase** - User reviews/edits extracted requirements before proceeding

## Conversation Architecture

The interview uses a message-based conversational model (not batched rounds):

- Messages stored in `interviewMessages` table (per-message, timestamped)
- Project tracks phase via `interviewPhase` field: `"seed"` | `"conversation"` | `"summary"`
- AI decides question type per turn: `choice`, `multiselect`, or `text`
- Mini-summaries every 2-3 answers
- AI sets `isComplete: true` when extraction checklist satisfied
- Hard cap at 10 user exchanges
- User can finish early via "I've shared enough" link

## Extraction Checklist

The AI covers these before signaling completion:
- Core data objects and relationships
- User actions (create, edit, delete, view, share)
- Screens/pages and navigation flow
- Authentication requirement and methods
- Permissions model (private, shared, public, roles)
- Automation or AI behavior
- External integrations
- In-scope vs out-of-scope

## Using Vercel AI SDK with Vertex AI

```typescript
import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
  },
});

const { text } = await generateText({
  model: vertex("gemini-2.5-flash"),
  system: CONVERSATION_SYSTEM_PROMPT,
  messages: conversationHistory,
});
```

**Model**: `gemini-2.5-flash`

## State Management

- Messages stored in `interviewMessages` table (reactive query)
- Phase tracked via `projects.interviewPhase`
- Final requirements stored in `projects.requirements`
- Legacy `interviewSessions` table kept for backward compat (unused for new interviews)
- Convex actions for AI API calls

## Key Files

- `convex/schema.ts` - `interviewMessages` table, `interviewPhase` field
- `convex/interviews.ts` - `getMessages`, `addMessage`, `clearMessages`
- `convex/ai.ts` - `continueConversation`, `extractRequirements`
- `convex/projects.ts` - `updateAppIdea`, `updateInterviewPhase`, `resetInterview`
- `prompts/interview-conversation.ts` - `CONVERSATION_SYSTEM_PROMPT`
- `prompts/requirements-extraction.ts` - `REQUIREMENTS_SYSTEM_PROMPT`
- `src/app/interview/[id]/page.tsx` - Interview UI

## Requirements Schema

See [reference.md](reference.md) for complete `Requirements` interface.

## UX Components

- `ChatMessage` for AI/user messages with typewriter effect
- `AIConversation` wrapper for layout
- `ChoiceGrid` for single/multi-select options (rendered inline below AI message)
- `MagicTextarea` for text input (pinned to bottom)
- Typewriter only on unseen AI messages (tracks via `useRef`)

## Reference Files

- [reference.md](reference.md) - Code patterns, schemas, AI action examples

## External Documentation

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [@ai-sdk/google-vertex](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)

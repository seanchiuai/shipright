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
- Ultra-casual texting style, max 15 words per response
- AI sets `isComplete: true` when app is classified (usually 4-6 exchanges)
- Hard cap at 6 user exchanges
- User can finish early via "I've shared enough" link

## Classification Flow

The AI covers these (adapting to context, skipping what's obvious):
- What is it? (restate + confirm)
- Who's it for?
- Core action users take
- Does money change hands?
- Mobile, web, or both?
- Dealbreakers or must-haves

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

- `TypewriterText` - Animated text component with typewriter effect and blinking cursor
- `ChatMessage` - AI/user messages with typewriter effect
- `AIConversation` - Wrapper for layout
- `ChoiceCard` / `ChoiceGrid` - Single/multi-select options (rendered inline below AI message)
- `MagicTextarea` - Text input (pinned to bottom)
- `LoadingDots` - Bouncing dots indicator during AI response
- `RequirementsSummary` - Editable requirements display (summary phase)
- `InterviewInputArea` - Bottom input area with example chips, text input, finish early
- `JourneyProgress` - 4-step progress indicator (Idea → Questions → Review → Build)
- `InterviewBackground` - Warm gradient background with subtle animations
- Typewriter only on unseen AI messages (tracks via `useRef`)

## Reference Files

- [reference.md](reference.md) - Code patterns, schemas, AI action examples

## External Documentation

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [@ai-sdk/google-vertex](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)

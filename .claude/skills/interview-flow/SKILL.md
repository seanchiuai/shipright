---
name: interview-flow
description: AI-guided interview for extracting app requirements
---

# Interview Flow

AI-guided interview that extracts structured requirements from user's app idea.

## Where It Fits

**Phase 2**: After authentication, before template matching.

## The Flow

1. **Initial Input** - User describes app idea (500 char max)
2. **AI Questions** - Gemini generates 3-5 questions per round
3. **User Answers** - Chat-based UI with typewriter effect
4. **Rounds** - Max 3 rounds to clarify requirements
5. **Extract Requirements** - Gemini converts answers to structured JSON
6. **User Confirms** - User reviews/edits requirements before proceeding

## Question Categories

Questions cover:
- User types (who uses this app?)
- Authentication needs (login? social auth? roles?)
- Data/database needs (what data? realtime?)
- Core features (what can users do?)
- Integrations (payments? email? third-party APIs?)

## Using Vercel AI SDK with Vertex AI

We use the Vercel AI SDK with `@ai-sdk/google-vertex` provider for Gemini calls.

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

// Generate follow-up questions
const { text } = await generateText({
  model: vertex("gemini-2.5-flash"),
  prompt: `Based on this app idea: "${appIdea}"

Generate 3-5 clarifying questions to understand the requirements.
Format as JSON array: [{ "question": "...", "type": "text|select|multiselect", "options": [...] }]`,
});

const questions = JSON.parse(text);
```

**Model**: `gemini-2.5-flash`
**Cost**: ~$0.003 per 3-round interview (10x cheaper than Claude)

## State Management

- Save each round to `interviewSessions` table
- Store final requirements in `projects.requirements`
- Use Convex actions for all AI API calls

## Requirements Schema

See [reference.md](reference.md) for complete `Requirements` interface.

## UX Notes

Step 2 interview uses chat-based UI:
- `ChatMessage` for AI/user messages with typewriter effect
- `AIConversation` wrapper for auto-scroll
- `ChoiceGrid` for single/multi-select options
- `MagicTextarea` for text input
- `JourneyProgress` bar showing step/round
- `CelebrationBurst` confetti on answer submission

## Reference Files

- [reference.md](reference.md) - Complete prompts, schemas, extraction logic

## External Documentation

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [@ai-sdk/google-vertex](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)

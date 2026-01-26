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
2. **AI Questions** - Claude generates 3-5 questions per round
3. **User Answers** - Interactive form (not chat bubbles)
4. **Rounds** - Max 3 rounds to clarify requirements
5. **Extract Requirements** - Claude converts answers to structured JSON
6. **User Confirms** - User reviews/edits requirements before proceeding

## Question Categories

Questions cover:
- User types (who uses this app?)
- Authentication needs (login? social auth? roles?)
- Data/database needs (what data? realtime?)
- Core features (what can users do?)
- Integrations (payments? email? third-party APIs?)

## Using Vercel AI SDK

We use the Vercel AI SDK with `@ai-sdk/anthropic` provider for all Claude calls.

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// Generate follow-up questions
const { text } = await generateText({
  model: anthropic("claude-sonnet-4"),
  prompt: `Based on this app idea: "${appIdea}"

Generate 3-5 clarifying questions to understand the requirements.
Format as JSON array: [{ "question": "...", "type": "text|select|multiselect", "options": [...] }]`,
});

const questions = JSON.parse(text);
```

**Model**: `claude-sonnet-4`
**Cost**: ~$0.03 per 3-round interview

## Streaming (optional)

For real-time question generation:

```typescript
import { streamText } from "ai";

const result = streamText({
  model: anthropic("claude-sonnet-4"),
  prompt: questionPrompt,
});

return result.toTextStreamResponse();
```

## State Management

- Save each round to `interviewSessions` table
- Store final requirements in `projects.requirements`
- Use Convex actions for all Claude API calls

## Requirements Schema

See [reference.md](reference.md) for complete `Requirements` interface.

## UX Notes (TBD)

Step 2 interview UX needs detailed planning:
- Form layout vs conversation style
- Question types (text, select, multiselect)
- Back navigation behavior
- Progress indication

## Reference Files

- [reference.md](reference.md) - Complete prompts, schemas, extraction logic

## External Documentation

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [@ai-sdk/anthropic](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic)

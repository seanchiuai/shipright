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

## Requirements Schema

See [reference.md](reference.md) for complete `Requirements` interface.

## Using Claude API

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 2048,
  messages: [{ role: "user", content: "..." }],
});
```

**Model**: `claude-sonnet-4-5-20250929`
**Cost**: ~$0.03 per 3-round interview

## State Management

- Save each round to `interviewSessions` table
- Store final requirements in `projects.requirements`
- Use Convex actions for all Claude API calls

## Reference Files

- [reference.md](reference.md) - Complete Claude API examples, prompts, schemas

## External Documentation

- [Anthropic API](https://docs.anthropic.com)
- Use Context7 MCP for current SDK docs

# Interview Flow Reference

Complete Vercel AI SDK integration with Google Vertex AI (Gemini) for Shipright's interview flow.

## Installation

```bash
npm install ai @ai-sdk/google-vertex
```

## Google Vertex AI Setup

### Provider Configuration (Node.js)

```typescript
import { createVertex } from '@ai-sdk/google-vertex';

// Create provider with explicit credentials (recommended for Convex)
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  },
});
```

### Available Gemini Models

| Model | Use Case |
|-------|----------|
| `gemini-2.5-flash` | Fast, cost-effective (recommended) |
| `gemini-2.5-pro` | Most capable |
| `gemini-2.0-flash-001` | Previous gen fast |
| `gemini-1.5-pro` | Previous gen capable |
| `gemini-1.5-flash` | Previous gen fast |

### Environment Variables

```bash
# Google Cloud Service Account
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Set in Convex:
```bash
npx convex env set GOOGLE_VERTEX_PROJECT your-project-id
npx convex env set GOOGLE_VERTEX_LOCATION us-central1
npx convex env set GOOGLE_CLIENT_EMAIL your-sa@project.iam.gserviceaccount.com
npx convex env set GOOGLE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----..."
```

## Requirements Schema

```typescript
interface Requirements {
  appName: string;
  problemStatement: string;
  userTypes: Array<{
    name: string;
    description: string;
    isAdmin: boolean;
  }>;
  auth: {
    needed: boolean;
    methods: ("email" | "google" | "github")[];
    hasRoles: boolean;
    hasOrgs: boolean;
  };
  database: {
    needed: boolean;
    realtime: boolean;
  };
  payments: {
    needed: boolean;
    model?: "one-time" | "subscription";
  };
  features: Array<{
    name: string;
    description: string;
    priority: "must" | "should" | "could";
  }>;
  integrations: string[];
}
```

## Generating Interview Questions (Convex Action)

```typescript
// convex/ai.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { api } from "./_generated/api";

// Create Vertex AI provider with service account credentials
function getVertexProvider() {
  return createVertex({
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    googleAuthOptions: {
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    },
  });
}

const QUESTION_SYSTEM_PROMPT = `You are an expert product manager helping non-technical founders clarify their app ideas.

Your job is to ask 3-5 targeted questions to understand:
- Who will use this app (user types, roles)
- Authentication needs (login, social auth, permissions)
- Core features and functionality
- Data/database requirements
- Third-party integrations (payments, email, etc.)

Rules:
- Ask only questions that will help select a template or build the app
- Be conversational and friendly
- Focus on technical requirements, not business strategy
- Make each question count - max 3 rounds total
- Use different question types appropriately:
  - "text" for open-ended questions
  - "choice" for single-select options
  - "multiselect" for multi-select options

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "id": "q1",
    "question": "Who will be the primary users of your app?",
    "type": "text",
    "required": true
  },
  {
    "id": "q2",
    "question": "Will users need to create accounts?",
    "type": "choice",
    "options": ["Yes, with email/password", "Yes, with Google/social login", "Yes, with multiple options", "No accounts needed"],
    "required": true
  }
]`;

export const generateInterviewQuestions = action({
  args: {
    projectId: v.id("projects"),
    appIdea: v.string(),
    round: v.number(),
    previousRounds: v.optional(
      v.array(
        v.object({
          questions: v.array(v.any()),
          answers: v.any(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const vertex = getVertexProvider();

    let prompt = `The user wants to build: "${args.appIdea}"`;

    if (args.previousRounds && args.previousRounds.length > 0) {
      prompt += "\n\nPrevious interview rounds:\n";
      for (let i = 0; i < args.previousRounds.length; i++) {
        const round = args.previousRounds[i];
        prompt += `\nRound ${i + 1}:\n`;
        prompt += `Questions: ${JSON.stringify(round.questions)}\n`;
        prompt += `Answers: ${JSON.stringify(round.answers)}\n`;
      }
      prompt += `\nThis is round ${args.round}. Build on previous answers and ask about areas not yet covered.`;
    } else {
      prompt += "\n\nThis is round 1. Start by understanding the basics.";
    }

    prompt += "\n\nGenerate 3-5 interview questions as JSON array.";

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: QUESTION_SYSTEM_PROMPT,
      prompt,
    });

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }
    const questions = JSON.parse(jsonText);

    // Save questions to database
    await ctx.runMutation(api.interviews.saveQuestions, {
      projectId: args.projectId,
      round: args.round,
      questions,
    });

    return { questions };
  },
});
```

## Extracting Requirements (Convex Action)

```typescript
const REQUIREMENTS_SYSTEM_PROMPT = `You are extracting structured requirements from an interview about an app idea.

Output ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "appName": "string - a short, catchy name for the app",
  "problemStatement": "string - one sentence describing what problem this solves",
  "userTypes": [
    { "name": "string", "description": "string", "isAdmin": boolean }
  ],
  "auth": {
    "needed": boolean,
    "methods": ["email", "google", "github"],
    "hasRoles": boolean,
    "hasOrgs": boolean
  },
  "database": {
    "needed": boolean,
    "realtime": boolean
  },
  "payments": {
    "needed": boolean,
    "model": "one-time" | "subscription" | null
  },
  "features": [
    {
      "name": "string",
      "description": "string",
      "priority": "must" | "should" | "could"
    }
  ],
  "integrations": ["stripe", "sendgrid", etc]
}

Be comprehensive but realistic. If something wasn't mentioned, use sensible defaults.`;

export const extractRequirements = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const vertex = getVertexProvider();

    const project = await ctx.runQuery(api.projects.get, {
      projectId: args.projectId,
    });

    if (!project?.appIdea) {
      throw new Error("Project has no app idea");
    }

    const rounds = await ctx.runQuery(api.interviews.getRounds, {
      projectId: args.projectId,
    });

    let prompt = `App idea: "${project.appIdea}"`;

    if (rounds.length > 0) {
      prompt += "\n\nInterview data:\n";
      for (const round of rounds) {
        prompt += `\nRound ${round.round}:\n`;
        prompt += `Questions: ${JSON.stringify(round.questions)}\n`;
        prompt += `Answers: ${JSON.stringify(round.answers)}\n`;
      }
    }

    prompt += "\n\nExtract structured requirements from this interview.";

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: REQUIREMENTS_SYSTEM_PROMPT,
      prompt,
    });

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }
    const requirements = JSON.parse(jsonText);

    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return { requirements };
  },
});
```

## Error Handling

```typescript
import { generateText, APICallError } from "ai";

try {
  const { text } = await generateText({
    model: vertex("gemini-2.5-flash"),
    prompt: "...",
  });
} catch (error) {
  if (error instanceof APICallError) {
    if (error.statusCode === 429) {
      throw new Error("Rate limited. Please try again.");
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      throw new Error("Authentication failed. Check service account credentials.");
    }
  }
  throw error;
}
```

## Cost Estimation

- Gemini 2.5 Flash: ~$0.075/million input tokens, ~$0.30/million output tokens
- Typical interview: ~1500 input + 2000 output tokens per round
- 3 rounds ≈ $0.003 per interview (10x cheaper than Claude)

## Alternative: Anthropic via Vertex AI

Vertex AI also supports Claude models as a partner offering:

```typescript
import { createVertexAnthropic } from "@ai-sdk/google-vertex";

const anthropic = createVertexAnthropic({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: "us-east5", // Claude available in limited regions
});

const { text } = await generateText({
  model: anthropic("claude-sonnet-4@20250514"),
  prompt: "...",
});
```

Sources:
- [AI SDK Google Vertex Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)
- [NPM Package](https://www.npmjs.com/package/@ai-sdk/google-vertex)

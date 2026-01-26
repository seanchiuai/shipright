# Interview Flow Reference

Complete Claude API integration, system prompts, and requirements extraction for Shipright's interview flow.

## Installation

```bash
npm install @anthropic-ai/sdk
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
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "./_generated/api";

export const generateInterviewQuestions = action({
  args: {
    userInput: v.string(),
    round: v.number(),
    previousAnswers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const conversationHistory = buildHistory(args.previousAnswers);

    const systemPrompt = `You are an expert product manager helping non-technical founders clarify their app ideas.

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
- If round ${args.round} > 1, build on previous answers
- Max 3 rounds total - make each question count

Return questions as a JSON array:
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
    "options": ["Yes, with email/password", "Yes, with Google/social login", "No accounts needed"],
    "required": true
  }
]`;

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: `Round ${args.round} - User's idea: "${args.userInput}"\n\nGenerate interview questions.`,
          },
        ],
      });

      const textContent = response.content.find(block => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      const questions = JSON.parse(textContent.text);

      await ctx.runMutation(api.interviews.saveQuestions, {
        round: args.round,
        questions,
      });

      return {
        questions,
        usage: response.usage,
      };
    } catch (error: any) {
      if (error instanceof Anthropic.APIError) {
        console.error("Anthropic API error:", error.status, error.message);
        throw new Error(`AI question generation failed: ${error.message}`);
      }
      throw error;
    }
  },
});

function buildHistory(previousAnswers?: any): Anthropic.MessageParam[] {
  if (!previousAnswers || previousAnswers.length === 0) return [];

  const messages: Anthropic.MessageParam[] = [];
  for (const round of previousAnswers) {
    messages.push({
      role: "user",
      content: JSON.stringify(round.questions),
    });
    messages.push({
      role: "assistant",
      content: JSON.stringify(round.answers),
    });
  }
  return messages;
}
```

## Extracting Requirements (Convex Action)

```typescript
export const extractRequirements = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const rounds = await ctx.runQuery(api.interviews.getRounds, {
      projectId: args.projectId,
    });

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `Extract structured requirements from interview responses.

Output valid JSON matching this schema:
{
  "appName": "string",
  "problemStatement": "string",
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
  "integrations": ["stripe", "sendgrid", "twilio"]
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Interview data:\n${JSON.stringify(rounds, null, 2)}\n\nExtract requirements as JSON.`,
        },
      ],
    });

    const textContent = response.content.find(block => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    const requirements = JSON.parse(textContent.text);

    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return requirements;
  },
});
```

## Client-Side React Component

```tsx
"use client";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InterviewForm({ projectId }: { projectId: string }) {
  const [round, setRound] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const generateQuestions = useAction(api.ai.generateInterviewQuestions);
  const extractRequirements = useAction(api.ai.extractRequirements);

  async function handleSubmitIdea() {
    const result = await generateQuestions({
      userInput,
      round: 1,
    });
    setQuestions(result.questions);
    setRound(1);
  }

  async function handleSubmitAnswers() {
    if (round < 3) {
      const result = await generateQuestions({
        userInput,
        round: round + 1,
        previousAnswers: answers,
      });
      setQuestions(result.questions);
      setRound(round + 1);
    } else {
      const requirements = await extractRequirements({ projectId });
      // Show requirements summary
    }
  }

  return (
    <div className="space-y-6">
      {round === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Describe your app idea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="idea">What do you want to build?</Label>
              <Input
                id="idea"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="I want to build..."
                maxLength={500}
              />
            </div>
            <Button onClick={handleSubmitIdea}>Start Interview</Button>
          </CardContent>
        </Card>
      )}

      {round > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Round {round} of 3</p>
          {/* Render questions */}
          <Button onClick={handleSubmitAnswers}>
            {round < 3 ? "Next" : "Finish Interview"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

```typescript
try {
  const response = await client.messages.create({...});
} catch (error: any) {
  if (error instanceof Anthropic.APIError) {
    console.error("API Error:", {
      status: error.status,
      message: error.message,
      type: error.type,
    });

    if (error.status === 429) {
      throw new Error("Rate limited. Please try again in a moment.");
    } else if (error.status === 401) {
      throw new Error("Invalid API key");
    } else if (error.status === 400) {
      throw new Error("Invalid request. Check your prompt format.");
    }
  }
  throw error;
}
```

## Token Management

```typescript
// Count tokens before sending
const tokenCount = await client.messages.countTokens({
  model: "claude-sonnet-4-5-20250929",
  messages: [
    { role: "user", content: "Your prompt here" },
  ],
});

console.log("Estimated input tokens:", tokenCount.input_tokens);

// After response
console.log("Actual usage:", response.usage);
// { input_tokens: 123, output_tokens: 456 }
```

**Cost Estimation**:
- Claude Sonnet 4.5: ~$3/million input tokens, ~$15/million output tokens
- Typical interview: ~1000 input + 2000 output tokens per round
- 3 rounds ≈ $0.03 per interview

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Set in Convex:
```bash
npx convex env set ANTHROPIC_API_KEY <your-key>
```

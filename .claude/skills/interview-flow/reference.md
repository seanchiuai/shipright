# Interview Flow Reference

Complete Vercel AI SDK integration, system prompts, and requirements extraction for Shipright's interview flow.

## Installation

```bash
npm install ai @ai-sdk/anthropic
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
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { api } from "./_generated/api";

export const generateInterviewQuestions = action({
  args: {
    userInput: v.string(),
    round: v.number(),
    previousAnswers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
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

    const conversationHistory = buildHistory(args.previousAnswers);
    const prompt = `${conversationHistory}

Round ${args.round} - User's idea: "${args.userInput}"

Generate interview questions as JSON array.`;

    const { text, usage } = await generateText({
      model: anthropic("claude-sonnet-4"),
      system: systemPrompt,
      prompt,
    });

    const questions = JSON.parse(text);

    await ctx.runMutation(api.interviews.saveQuestions, {
      round: args.round,
      questions,
    });

    return { questions, usage };
  },
});

function buildHistory(previousAnswers?: any): string {
  if (!previousAnswers || previousAnswers.length === 0) return "";

  let history = "Previous rounds:\n";
  for (const round of previousAnswers) {
    history += `Questions: ${JSON.stringify(round.questions)}\n`;
    history += `Answers: ${JSON.stringify(round.answers)}\n\n`;
  }
  return history;
}
```

## Extracting Requirements (Convex Action)

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const extractRequirements = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const rounds = await ctx.runQuery(api.interviews.getRounds, {
      projectId: args.projectId,
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

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4"),
      system: systemPrompt,
      prompt: `Interview data:\n${JSON.stringify(rounds, null, 2)}\n\nExtract requirements as JSON.`,
    });

    const requirements = JSON.parse(text);

    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return requirements;
  },
});
```

## Streaming Questions (Optional)

For real-time streaming in Next.js API route:

```typescript
// app/api/interview/questions/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { userInput, round, previousAnswers } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4"),
    system: systemPrompt,
    prompt: `Round ${round} - User's idea: "${userInput}"\n\nGenerate interview questions.`,
  });

  return result.toTextStreamResponse();
}
```

## Client-Side React Component

```tsx
"use client";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InterviewForm({ projectId }: { projectId: string }) {
  const [round, setRound] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const generateQuestions = useAction(api.ai.generateInterviewQuestions);
  const extractRequirements = useAction(api.ai.extractRequirements);

  async function handleSubmitIdea() {
    setLoading(true);
    try {
      const result = await generateQuestions({
        userInput,
        round: 1,
      });
      setQuestions(result.questions);
      setRound(1);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswers() {
    setLoading(true);
    try {
      if (round < 3) {
        const result = await generateQuestions({
          userInput,
          round: round + 1,
          previousAnswers: [{ questions, answers }],
        });
        setQuestions(result.questions);
        setRound(round + 1);
        setAnswers({});
      } else {
        await extractRequirements({ projectId });
        // Navigate to requirements summary
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {round === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What do you want to build?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="idea">Describe your app idea</Label>
              <Textarea
                id="idea"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="I want to build an app where..."
                maxLength={500}
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {userInput.length}/500
              </p>
            </div>
            <Button onClick={handleSubmitIdea} disabled={loading || !userInput}>
              {loading ? "Generating questions..." : "Next"}
            </Button>
          </CardContent>
        </Card>
      )}

      {round > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>A few questions (Round {round}/3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>{q.question}</Label>
                {q.type === "text" ? (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {q.options?.map((opt: string) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers({ ...answers, [q.id]: opt })
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button onClick={handleSubmitAnswers} disabled={loading}>
              {loading
                ? "Processing..."
                : round < 3
                  ? "Next"
                  : "Finish Interview"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Error Handling

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, APICallError } from "ai";

try {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4"),
    prompt: "...",
  });
} catch (error) {
  if (error instanceof APICallError) {
    if (error.statusCode === 429) {
      // Rate limited - wait and retry
      const retryAfter = error.responseHeaders?.get("retry-after");
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
    } else if (error.statusCode === 401) {
      throw new Error("Invalid API key");
    }
  }
  throw error;
}
```

## Cost Estimation

- Claude Sonnet 4: ~$3/million input tokens, ~$15/million output tokens
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

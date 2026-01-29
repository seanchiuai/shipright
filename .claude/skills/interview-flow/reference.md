# Interview Flow Reference

Vercel AI SDK integration with Google Vertex AI (Gemini) for Shipright's conversational interview.

## Installation

```bash
npm install ai @ai-sdk/google-vertex
```

## Google Vertex AI Setup

### Provider Configuration (Node.js)

```typescript
import { createVertex } from '@ai-sdk/google-vertex';

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

### Environment Variables

```bash
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Data Model

### interviewMessages table

```typescript
interviewMessages: defineTable({
  projectId: v.id("projects"),
  role: v.string(),                    // "user" | "assistant"
  content: v.string(),
  questionType: v.optional(v.union(v.literal("text"), v.literal("choice"), v.literal("multiselect"))),
  options: v.optional(v.array(v.string())),
  isComplete: v.optional(v.boolean()),
  timestamp: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_project_timestamp", ["projectId", "timestamp"]),
```

### projects.interviewPhase

```typescript
interviewPhase: v.optional(v.string()),  // "seed" | "conversation" | "summary"
```

## Requirements Schema

```typescript
interface Requirements {
  appName: string;
  tagline: string;
  appType: string;
  problemStatement: string;
  primaryUser: { type: string; coreNeed: string };
  secondaryUsers: Array<{ type: string; coreNeed: string }>;
  coreAction: string;
  hasPayments: boolean;
  paymentContext: string | null;
  platform: string;
  keyFeatures: string[];
  constraints: {
    timeline: string | null;
    mustHave: string[];
    mustNotHave: string[];
  };
  devAgentNotes: string;
}
```

## Continue Conversation (Convex Action)

```typescript
// convex/ai.ts
export const continueConversation = action({
  args: {
    projectId: v.id("projects"),
    appIdea: v.string(),
    history: v.array(v.object({
      role: v.string(),
      content: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const vertex = getVertexProvider();

    const messages = [
      { role: "user" as const, content: `The user wants to build: "${args.appIdea}"` },
      ...args.history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: CONVERSATION_SYSTEM_PROMPT,
      messages,
    });

    let parsed;
    try {
      parsed = parseJsonResponse(text);
    } catch {
      parsed = { content: text.trim(), questionType: null };
    }

    // Persist AI message
    await ctx.runMutation(api.interviews.addMessage, {
      projectId: args.projectId,
      role: "assistant",
      content: parsed.content,
      ...(parsed.questionType ? { questionType: parsed.questionType } : {}),
      ...(parsed.options ? { options: parsed.options } : {}),
      ...(parsed.isComplete ? { isComplete: true } : {}),
    });

    return parsed;
  },
});
```

## AI Response Format

The conversation prompt expects JSON output:

```json
{
  "content": "Message text with \\n for line breaks",
  "questionType": "choice" | "multiselect" | "text" | null,
  "options": ["Option 1", "Option 2"] | null,
  "isComplete": false
}
```

## Extracting Requirements (Convex Action)

```typescript
export const extractRequirements = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Reads from interviewMessages table
    // Falls back to legacy interviewSessions if no messages
    // Builds transcript and sends to Gemini with REQUIREMENTS_SYSTEM_PROMPT
    // Saves structured requirements to project via updateRequirements
  },
});
```

## Interview Queries/Mutations

```typescript
// convex/interviews.ts
getMessages(projectId)     // Query: all messages ordered by timestamp asc
addMessage(projectId, role, content, questionType?, options?, isComplete?)
clearMessages(projectId)   // Delete all messages for project

// convex/projects.ts
updateAppIdea(projectId, appIdea)          // Sets interviewPhase: "conversation"
updateInterviewPhase(projectId, phase)     // Direct phase update
updateRequirements(projectId, requirements) // Sets interviewPhase: "summary"
resetInterview(projectId)                  // Clears messages + sessions, resets phase
```

## Frontend State Model

```typescript
// Reactive queries
const messages = useQuery(api.interviews.getMessages, { projectId });
const project = useQuery(api.projects.get, { projectId });

// Local state
const [currentInput, setCurrentInput] = useState("");
const [loading, setLoading] = useState(false);
const [isTypewriterDone, setIsTypewriterDone] = useState(true);
const [multiselectValue, setMultiselectValue] = useState<string[]>([]);
const [customInputMode, setCustomInputMode] = useState(false);

// Derived
const phase = project?.interviewPhase || "seed";
const isComplete = messages?.some((m) => m.isComplete);
const lastAiMsg = messages?.filter((m) => m.role === "assistant").at(-1);
const exchangeCount = messages?.filter((m) => m.role === "user").length ?? 0;
```

## Error Handling

```typescript
import { generateText, APICallError } from "ai";

try {
  const { text } = await generateText({ ... });
} catch (error) {
  if (error instanceof APICallError) {
    if (error.statusCode === 429) throw new Error("Rate limited.");
    if (error.statusCode === 401 || error.statusCode === 403)
      throw new Error("Authentication failed.");
  }
  throw error;
}
```

## Cost Estimation

- Gemini 2.5 Flash: ~$0.075/million input tokens, ~$0.30/million output tokens
- Conversational interview (~8 turns): ~$0.004 per interview

## Sources

- [AI SDK Google Vertex Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)
- [NPM Package](https://www.npmjs.com/package/@ai-sdk/google-vertex)

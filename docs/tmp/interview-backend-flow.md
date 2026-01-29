# Interview Backend Flow

## Overview

User submits an app idea, has a multi-turn AI conversation to flesh out requirements, then the system extracts structured requirements from the transcript.

## Step-by-step

1. **User submits app idea** (seed phase)
   - Idea stored as a message and saved to the project record
   - Project phase transitions from "seed" to "conversation"
   - System calls `continueConversation` to generate the first AI question
   - **Prompt used: `CONVERSATION_SYSTEM_PROMPT`** — tells the AI to act as a product architect and ask focused questions about the app idea

2. **Multi-turn conversation** (conversation phase)
   - User answers each AI question (text, choice, or multiselect)
   - Each answer is stored as a message, then the full message history is sent to `continueConversation`
   - `continueConversation` sends the history + system prompt to Gemini 2.5 Flash via Vertex AI
   - The AI can also call a web search tool (Tavily API) to look up services, APIs, or integrations
   - AI returns a JSON object with: the next question, its type, any options, and whether the interview is complete
   - The AI response is stored as a message in the database
   - **Prompt used: `CONVERSATION_SYSTEM_PROMPT`** (same prompt, every turn)

3. **Conversation ends** when any of these happen:
   - The AI sets `isComplete: true` in its response
   - The user has sent 10 messages
   - The user clicks "I've shared enough"

4. **Requirements extraction** (transition to summary phase)
   - System calls `extractRequirements`, which fetches the full message transcript
   - Sends the transcript to Gemini with a different prompt
   - AI outputs structured JSON: app name, problem statement, user types, auth needs, database needs, payment model, features list, and integrations
   - Result saved to the project record; phase transitions to "summary"
   - **Prompt used: `REQUIREMENTS_SYSTEM_PROMPT`** — tells the AI to parse the transcript into a fixed JSON schema

5. **Summary review** (summary phase)
   - User sees the extracted requirements and can edit them inline
   - User clicks "Find My Template" to move on to template matching (project status changes to "matching")

6. **Reset** (optional, any time)
   - Deletes all messages, clears project fields, returns to seed phase

## Prompt inventory

| Prompt | Where used | Purpose |
|--------|-----------|---------|
| `CONVERSATION_SYSTEM_PROMPT` | `convex/ai.ts` — `continueConversation` action | Guides AI to ask focused questions each turn |
| `REQUIREMENTS_SYSTEM_PROMPT` | `convex/ai.ts` — `extractRequirements` action | Converts transcript into structured JSON |
| `QUESTION_SYSTEM_PROMPT` | Unused (legacy) | Old round-based question generation |
| `ENCOURAGEMENT_SYSTEM_PROMPT` | Unused (legacy) | Old between-question encouragement |
| `COMPLETION_SYSTEM_PROMPT` | Unused (legacy) | Old interview-complete celebration |

2 prompts active, 3 legacy.

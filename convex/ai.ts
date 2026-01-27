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

// Helper to parse JSON that might be wrapped in markdown code blocks
function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }
  return JSON.parse(jsonText);
}

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

    const questions = parseJsonResponse(text);

    // Save questions to database
    await ctx.runMutation(api.interviews.saveQuestions, {
      projectId: args.projectId,
      round: args.round,
      questions: questions as Array<{
        id: string;
        question: string;
        type: string;
        options?: string[];
        required?: boolean;
      }>,
    });

    return { questions };
  },
});

export const extractRequirements = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const vertex = getVertexProvider();

    // Get project for app idea
    const project = await ctx.runQuery(api.projects.get, {
      projectId: args.projectId,
    });

    if (!project?.appIdea) {
      throw new Error("Project has no app idea");
    }

    // Get all interview rounds
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

    const requirements = parseJsonResponse(text);

    // Save requirements to project
    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return { requirements };
  },
});

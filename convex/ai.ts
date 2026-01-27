"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { api } from "./_generated/api";

// Create Anthropic client - uses ANTHROPIC_API_KEY env var
const anthropic = createAnthropic();

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
      model: anthropic("claude-sonnet-4-20250514"),
      system: QUESTION_SYSTEM_PROMPT,
      prompt,
    });

    // Parse JSON from response
    const questions = JSON.parse(text.trim());

    // Save questions to database
    await ctx.runMutation(api.interviews.saveQuestions, {
      projectId: args.projectId,
      round: args.round,
      questions,
    });

    return { questions };
  },
});

export const extractRequirements = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
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
      model: anthropic("claude-sonnet-4-20250514"),
      system: REQUIREMENTS_SYSTEM_PROMPT,
      prompt,
    });

    // Parse JSON from response
    const requirements = JSON.parse(text.trim());

    // Save requirements to project
    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return { requirements };
  },
});

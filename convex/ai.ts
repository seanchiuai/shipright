"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { api } from "./_generated/api";
import {
  QUESTION_SYSTEM_PROMPT,
  REQUIREMENTS_SYSTEM_PROMPT,
  ENCOURAGEMENT_SYSTEM_PROMPT,
  COMPLETION_SYSTEM_PROMPT,
} from "../prompts";

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
      prompt += `\nThis is round ${args.round}. Build on previous answers and ask about areas not yet covered. In the preamble, acknowledge something specific from their previous answers.`;
    } else {
      prompt += "\n\nThis is round 1. Start by understanding the basics. In the preamble, welcome them warmly and show genuine excitement about their idea.";
    }

    prompt += "\n\nGenerate the interview questions with a contextual preamble.";

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: QUESTION_SYSTEM_PROMPT,
      prompt,
    });

    const result = parseJsonResponse(text) as {
      preamble: string;
      questions: Array<{
        id: string;
        question: string;
        type: string;
        options?: string[];
        required?: boolean;
      }>;
    };

    // Save questions to database
    await ctx.runMutation(api.interviews.saveQuestions, {
      projectId: args.projectId,
      round: args.round,
      questions: result.questions,
    });

    return {
      preamble: result.preamble,
      questions: result.questions,
    };
  },
});

export const generateEncouragement = action({
  args: {
    appIdea: v.string(),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (_, args) => {
    const vertex = getVertexProvider();

    const prompt = `App idea: "${args.appIdea}"
Question asked: "${args.question}"
User's answer: "${args.answer}"

Generate a brief encouragement.`;

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: ENCOURAGEMENT_SYSTEM_PROMPT,
      prompt,
    });

    return { encouragement: text.trim() };
  },
});

export const generateCompletionMessage = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<{ message: string }> => {
    const vertex = getVertexProvider();

    // Get project for app idea
    const project = await ctx.runQuery(api.projects.get, {
      projectId: args.projectId,
    }) as { appIdea?: string } | null;

    if (!project?.appIdea) {
      throw new Error("Project has no app idea");
    }

    // Get all interview rounds
    const rounds = await ctx.runQuery(api.interviews.getRounds, {
      projectId: args.projectId,
    }) as Array<{ questions?: unknown[]; answers?: Record<string, unknown> }>;

    let prompt: string = `App idea: "${project.appIdea}"`;

    if (rounds.length > 0) {
      prompt += "\n\nKey details gathered:\n";
      for (const round of rounds) {
        prompt += `Questions: ${JSON.stringify(round.questions)}\n`;
        prompt += `Answers: ${JSON.stringify(round.answers)}\n`;
      }
    }

    prompt += "\n\nGenerate an excited completion message.";

    const result = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: COMPLETION_SYSTEM_PROMPT,
      prompt,
    });

    return { message: result.text.trim() };
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

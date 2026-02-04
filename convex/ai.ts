"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { api } from "./_generated/api";
import {
  QUESTION_SYSTEM_PROMPT,
  REQUIREMENTS_SYSTEM_PROMPT,
  CONVERSATION_SYSTEM_PROMPT,
} from "../prompts";
import { getVertexProvider } from "./lib/vertex";

// Parse JSON that might be wrapped in markdown code blocks or extra text
export function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim();
  if (jsonText.includes("```")) {
    const match = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) jsonText = match[1].trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("No valid JSON found in response");
  }
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
      prompt += `\nThis is round ${args.round}. Build on previous answers and extract information about areas not yet covered.`;
    } else {
      prompt += "\n\nThis is round 1. In the preamble, restate their idea in concrete buildable terms and ask for confirmation.";
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

    // Strip extra fields the AI may add — Convex rejects unknown fields
    const cleanQuestions = result.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      ...(q.options ? { options: q.options } : {}),
      ...(q.required !== undefined ? { required: q.required } : {}),
    }));

    return {
      preamble: result.preamble,
      questions: cleanQuestions,
    };
  },
});

export const continueConversation = action({
  args: {
    projectId: v.id("projects"),
    appIdea: v.string(),
    history: v.array(v.object({
      role: v.string(),
      content: v.string(),
    })),
    exchangeCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const vertex = getVertexProvider();

    const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "user" as const, content: `The user wants to build: "${args.appIdea}"` },
      ...args.history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Soft nudge to wrap up after 6+ exchanges
    const count = args.exchangeCount ?? 0;
    if (count >= 6) {
      messages.push({
        role: "user" as const,
        content: "[SYSTEM] You've asked enough questions. Wrap it up now and set isComplete: true — unless this app is genuinely complex and you still have critical unknowns.",
      });
    }

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: CONVERSATION_SYSTEM_PROMPT,
      messages,
      tools: {
        searchWeb: {
          description:
            "Search the web for current info about a specific service, API, integration, or technical best practice. Only use when a user mentions a specific service by name or you need to verify technical feasibility.",
          inputSchema: z.object({
            query: z
              .string()
              .describe(
                "Concise search query about the service or integration"
              ),
          }),
          execute: async ({ query }: { query: string }) => {
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) return "Web search not configured.";
            const res = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: apiKey,
                query,
                max_results: 3,
                search_depth: "basic",
                include_answer: "basic",
              }),
            });
            if (!res.ok) return "Search failed.";
            const data = await res.json();
            let result = "";
            if (data.answer) result += `Summary: ${data.answer}\n\n`;
            if (data.results) {
              result += data.results
                .map(
                  (r: { title: string; content: string }) =>
                    `${r.title}: ${r.content}`
                )
                .join("\n\n");
            }
            return result || "No results found.";
          },
        },
      },
      stopWhen: stepCountIs(2),
    });

    let parsed: {
      content: string;
      questionType?: "text" | "choice" | "multiselect" | null;
      options?: string[] | null;
      isComplete?: boolean;
    };

    try {
      parsed = parseJsonResponse(text) as typeof parsed;
    } catch {
      parsed = { content: text.trim(), questionType: null };
    }

    // Persist AI message
    await ctx.runMutation(api.interviews.addMessage, {
      projectId: args.projectId,
      role: "assistant",
      content: parsed.content,
      ...(parsed.questionType ? { questionType: parsed.questionType as "text" | "choice" | "multiselect" } : {}),
      ...(parsed.options ? { options: parsed.options } : {}),
      ...(parsed.isComplete ? { isComplete: true } : {}),
    });

    return parsed;
  },
});

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

    // Build transcript from interview messages
    const messages = await ctx.runQuery(api.interviews.getMessages, {
      projectId: args.projectId,
    });

    let prompt = `App idea: "${project.appIdea}"`;

    if (messages.length > 0) {
      prompt += "\n\nInterview transcript:\n";
      for (const msg of messages) {
        const label = msg.role === "assistant" ? "Interviewer" : "User";
        prompt += `${label}: ${msg.content}\n`;
      }
    }

    prompt += "\n\nExtract structured requirements from this interview.";

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash"),
      system: REQUIREMENTS_SYSTEM_PROMPT,
      prompt,
    });

    const requirements = parseJsonResponse(text);

    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    return { requirements };
  },
});

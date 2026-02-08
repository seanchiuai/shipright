"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import {
  REQUIREMENTS_SYSTEM_PROMPT,
  CONVERSATION_SYSTEM_PROMPT,
} from "../prompts";
import { getVertexProvider } from "./lib/vertex";
import { parseJsonResponse } from "./lib/json";
import { formatLogEntry } from "./lib/logger";

// --- Exported helpers for testing ---

export function buildConversationMessages(
  appIdea: string,
  history: Array<{ role: string; content: string }>,
  exchangeCount?: number,
): { role: "user" | "assistant" | "system"; content: string }[] {
  if (!appIdea.trim()) {
    throw new Error("appIdea cannot be empty");
  }

  // Filter out messages with empty content — Gemini rejects empty parts
  const validHistory = history.filter((m) => m.content.trim().length > 0);

  if (validHistory.length === 0) {
    throw new Error("history must contain at least one non-empty message");
  }

  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "user" as const, content: `The user wants to build: "${appIdea}"` },
    ...validHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const count = exchangeCount ?? 0;
  if (count >= 6) {
    messages.push({
      role: "user" as const,
      content: "[SYSTEM] You've asked enough questions. Wrap it up now and set isComplete: true — unless this app is genuinely complex and you still have critical unknowns.",
    });
  }

  return messages;
}

export function buildRequirementsPrompt(
  appIdea: string,
  messages: Array<{ role: string; content: string }>,
): string {
  if (!appIdea.trim()) {
    throw new Error("appIdea cannot be empty");
  }

  let prompt = `App idea: "${appIdea}"`;

  if (messages.length > 0) {
    prompt += "\n\nInterview transcript:\n";
    for (const msg of messages) {
      const label = msg.role === "assistant" ? "Interviewer" : "User";
      prompt += `${label}: ${msg.content}\n`;
    }
  }

  prompt += "\n\nExtract structured requirements from this interview.";
  return prompt;
}

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
    console.log(formatLogEntry({ action: "continueConversation", projectId: args.projectId, step: "interview", status: "started", exchangeCount: args.exchangeCount ?? 0 }));
    const messages = buildConversationMessages(args.appIdea, args.history, args.exchangeCount);

    let text: string;
    try {
      const vertex = getVertexProvider();
      const result = await generateText({
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
              try {
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
                let searchResult = "";
                if (data.answer) searchResult += `Summary: ${data.answer}\n\n`;
                if (data.results) {
                  searchResult += data.results
                    .map(
                      (r: { title: string; content: string }) =>
                        `${r.title}: ${r.content}`
                    )
                    .join("\n\n");
                }
                return searchResult || "No results found.";
              } catch {
                return "Search temporarily unavailable.";
              }
            },
          },
        },
        stopWhen: stepCountIs(2),
      });
      text = result.text;
    } catch (e) {
      console.error(formatLogEntry({ action: "continueConversation", projectId: args.projectId, step: "interview", status: "failed", error: String(e) }));
      throw new Error("AI service temporarily unavailable. Please try again in a moment.");
    }

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

    // Guard: don't save empty AI responses (can happen when tool use consumes all steps)
    if (!parsed.content || parsed.content.trim().length === 0) {
      console.warn(`[continueConversation] Empty AI response for project ${args.projectId}, not saving to DB`);
      return { content: "", questionType: null };
    }

    console.log(formatLogEntry({ action: "continueConversation", projectId: args.projectId, step: "interview", status: "completed", isComplete: !!parsed.isComplete }));

    // Persist AI message
    await ctx.runMutation(internal.interviews.addMessageInternal, {
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
    console.log(formatLogEntry({ action: "extractRequirements", projectId: args.projectId, step: "requirements", status: "started" }));

    const project = await ctx.runQuery(internal.projects.getById, {
      projectId: args.projectId,
    });

    if (!project?.appIdea) {
      throw new Error("Project has no app idea — please describe your app first.");
    }

    const messages = await ctx.runQuery(internal.interviews.getMessagesInternal, {
      projectId: args.projectId,
    });

    if (!messages || messages.length === 0) {
      throw new Error("No interview messages found. Please answer at least one question first.");
    }

    const prompt = buildRequirementsPrompt(project.appIdea, messages);

    let text: string;
    try {
      const vertex = getVertexProvider();
      const result = await generateText({
        model: vertex("gemini-2.5-flash"),
        system: REQUIREMENTS_SYSTEM_PROMPT,
        prompt,
      });
      text = result.text;
    } catch (e) {
      console.error(formatLogEntry({ action: "extractRequirements", projectId: args.projectId, step: "requirements", status: "failed", error: String(e) }));
      throw new Error("AI service temporarily unavailable. Please try again in a moment.");
    }

    let requirements;
    try {
      requirements = parseJsonResponse(text);
    } catch (e) {
      console.error(formatLogEntry({ action: "extractRequirements", projectId: args.projectId, step: "requirements", status: "parse_failed", error: String(e), rawText: text.slice(0, 500) }));
      throw new Error("Failed to process AI response. Please try again.");
    }

    await ctx.runMutation(api.projects.updateRequirements, {
      projectId: args.projectId,
      requirements,
    });

    console.log(formatLogEntry({ action: "extractRequirements", projectId: args.projectId, step: "requirements", status: "completed" }));
    return { requirements };
  },
});

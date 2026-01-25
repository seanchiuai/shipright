import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function research(requirements: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const researchPrompt = `You are a senior software architect planning a web application.

Given these requirements:
${requirements}

Analyze and produce a detailed technical plan in JSON format covering:
1. Database schema (tables, columns, relationships, RLS policies)
2. API routes (endpoints, methods, request/response shapes)
3. Page structure (all pages, layouts, components)
4. Component architecture (reusable components, props)
5. Authentication flow
6. Edge cases and error handling

Output valid JSON only.`;

  const result = await model.generateContent(researchPrompt);
  return result.response.text();
}

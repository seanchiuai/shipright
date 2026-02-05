/** Parse JSON that might be wrapped in markdown code blocks or extra text */
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

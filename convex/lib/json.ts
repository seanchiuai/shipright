/**
 * JSON parsing utilities for AI responses.
 * Handles markdown code blocks and extracts JSON from mixed text.
 */

/**
 * Parse JSON that might be wrapped in markdown code blocks or extra text.
 * AI models often wrap JSON in ```json blocks or include prose around it.
 *
 * @param text - Raw text from AI response
 * @returns Parsed JSON value
 * @throws Error if no valid JSON found
 */
export function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim();

  // Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  if (jsonText.includes("```")) {
    const match = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) jsonText = match[1].trim();
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    // Fallback: try to extract first JSON object from text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("No valid JSON found in response");
  }
}

# Temporary Mock Mode (Development Only)

If you want to test the interview flow WITHOUT setting up Google Vertex AI, I can modify `convex/ai.ts` to return mock questions when env vars are missing.

## Quick Fix

Replace the `getVertexProvider()` calls with mock responses that return hardcoded interview questions.

**Pros:**
- Test the flow immediately
- No GCP setup required
- No API costs

**Cons:**
- Not production-ready
- Questions won't adapt to user input
- Must be replaced before launch

---

Would you like me to implement this temporary mock mode, or do you want to set up Google Vertex AI properly?

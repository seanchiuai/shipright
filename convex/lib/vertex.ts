import { createVertex } from "@ai-sdk/google-vertex/edge";

export function getVertexProvider() {
  if (!process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Missing required environment variable: GOOGLE_PRIVATE_KEY");
  }
  return createVertex({
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    googleCredentials: {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  });
}

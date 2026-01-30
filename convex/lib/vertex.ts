import { createVertex } from "@ai-sdk/google-vertex/edge";

export function getVertexProvider() {
  return createVertex({
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1",
    googleCredentials: {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
    },
  });
}

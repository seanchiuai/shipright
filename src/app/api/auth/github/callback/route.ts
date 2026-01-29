import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=no_code`);
  }

  let returnTo = "/dashboard";
  if (state) {
    try {
      const parsed = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      );
      if (parsed.returnTo?.startsWith("/")) {
        returnTo = parsed.returnTo;
      }
    } catch {
      // malformed state, use default
    }
  }

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=not_authenticated`);
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);

  try {
    await convex.action(api.github.exchangeGitHubCode, { code });
  } catch (error) {
    console.error("GitHub OAuth exchange failed:", error);
    return NextResponse.redirect(`${appUrl}/connect-github?error=exchange_failed`);
  }

  return NextResponse.redirect(`${appUrl}${returnTo}`);
}

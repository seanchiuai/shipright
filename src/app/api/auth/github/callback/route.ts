import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { getRequiredEnv } from "@/lib/env";
import { isSafeRedirectPath } from "@/lib/admin";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = rateLimit(getRateLimitKey(request, "github-callback"), {
    limit: 15,
    windowMs: 60_000, // 15 requests per minute
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=no_code`);
  }

  // Verify CSRF nonce from state matches cookie
  const cookieStore = await cookies();
  const expectedNonce = cookieStore.get("github_oauth_nonce")?.value;

  let returnTo = "/dashboard";
  if (state) {
    try {
      const parsed = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      );
      if (parsed.returnTo && isSafeRedirectPath(parsed.returnTo)) {
        returnTo = parsed.returnTo;
      }
      // CSRF check: nonce in state must match cookie
      if (!expectedNonce || parsed.nonce !== expectedNonce) {
        return NextResponse.redirect(`${appUrl}/connect-github?error=csrf_failed`);
      }
    } catch {
      return NextResponse.redirect(`${appUrl}/connect-github?error=invalid_state`);
    }
  } else {
    // No state at all — reject
    return NextResponse.redirect(`${appUrl}/connect-github?error=missing_state`);
  }

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.redirect(`${appUrl}/connect-github?error=not_authenticated`);
  }

  const convex = new ConvexHttpClient(getRequiredEnv("NEXT_PUBLIC_CONVEX_URL"));
  convex.setAuth(token);

  try {
    await convex.action(api.github.exchangeGitHubCode, { code });
  } catch (error) {
    console.error("GitHub OAuth exchange failed:", error);
    return NextResponse.redirect(`${appUrl}/connect-github?error=exchange_failed`);
  }

  // Clear the nonce cookie
  const response = NextResponse.redirect(`${appUrl}${returnTo}`);
  response.cookies.delete("github_oauth_nonce");
  return response;
}

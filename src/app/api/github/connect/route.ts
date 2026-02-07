import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isSafeRedirectPath } from "@/lib/admin";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = rateLimit(getRateLimitKey(request, "github-connect"), {
    limit: 10,
    windowMs: 60_000, // 10 requests per minute
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const rawReturnTo = url.searchParams.get("returnTo") || "/dashboard";
  const returnTo = isSafeRedirectPath(rawReturnTo) ? rawReturnTo : "/dashboard";

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${appUrl}/api/auth/github/callback`;

  // CSRF protection: include a cryptographic nonce in the state
  const nonce = randomUUID();
  const state = Buffer.from(JSON.stringify({ returnTo, nonce })).toString("base64url");

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo user:email");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  // Store nonce in HttpOnly cookie for verification in callback
  response.cookies.set("github_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/github/callback",
    maxAge: 600, // 10 minutes
  });
  return response;
}

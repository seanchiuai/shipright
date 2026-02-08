import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export function GET() {
  const error = new Error("Sentry test error — delete this route after verifying");
  Sentry.captureException(error);
  return NextResponse.json({ ok: true, message: "Test error sent to Sentry" });
}

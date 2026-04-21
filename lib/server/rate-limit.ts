import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { tooManyRequests } from "@/lib/server/api";
import { consumeRateLimitBucket } from "@/lib/server/db";

function getClientAddress(request: Request | NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }

  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

function buildRateLimitIdentifier(request: Request | NextRequest) {
  const address = getClientAddress(request);
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";

  return createHash("sha256")
    .update(`${address}|${userAgent}`)
    .digest("hex");
}

export async function enforceRateLimit(
  request: Request | NextRequest,
  input: {
    scope: string;
    maxRequests: number;
    windowMs: number;
    message: string;
  },
) {
  const result = await consumeRateLimitBucket({
    scope: input.scope,
    identifier: buildRateLimitIdentifier(request),
    maxRequests: input.maxRequests,
    windowMs: input.windowMs,
  });

  if (!result.allowed) {
    throw tooManyRequests(input.message, {
      retryAfterSeconds: result.retryAfterSeconds ?? 1,
    });
  }
}

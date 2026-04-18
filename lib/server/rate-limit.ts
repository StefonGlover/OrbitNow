import { NextRequest } from "next/server";
import { tooManyRequests } from "@/lib/server/api";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __orbitnowRateLimits?: Map<string, RateLimitBucket>;
};

const rateLimitStore =
  globalRateLimitStore.__orbitnowRateLimits ?? new Map<string, RateLimitBucket>();
globalRateLimitStore.__orbitnowRateLimits = rateLimitStore;

function getClientAddress(request: Request | NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }

  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of Array.from(rateLimitStore.entries())) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function enforceRateLimit(
  request: Request | NextRequest,
  input: {
    scope: string;
    maxRequests: number;
    windowMs: number;
    message: string;
  },
) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const bucketKey = `${input.scope}:${getClientAddress(request)}`;
  const existingBucket = rateLimitStore.get(bucketKey);

  if (!existingBucket || existingBucket.resetAt <= now) {
    rateLimitStore.set(bucketKey, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return;
  }

  if (existingBucket.count >= input.maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existingBucket.resetAt - now) / 1000),
    );

    throw tooManyRequests(input.message, {
      retryAfterSeconds,
    });
  }

  existingBucket.count += 1;
  rateLimitStore.set(bucketKey, existingBucket);
}

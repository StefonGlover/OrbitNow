import { errorResponse, badRequest, successResponse } from "@/lib/server/api";
import {
  applySessionCookie,
  assertSessionSecretConfigured,
  hashPassword,
  validateCredentialInput,
} from "@/lib/server/auth";
import { createUserRecord, toClientSession } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { OrbitAuthResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSessionSecretConfigured();
    enforceRateLimit(request, {
      scope: "auth-register",
      maxRequests: 5,
      windowMs: 1000 * 60 * 15,
      message: "Too many sign-up attempts. Please try again in a few minutes.",
    });

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const { email, password } = validateCredentialInput(
      typeof body === "object" && body ? (body as Record<string, unknown>) : {},
    );

    const passwordResult = hashPassword(password);
    const user = await createUserRecord({
      email,
      passwordHash: passwordResult.hash,
      passwordSalt: passwordResult.salt,
    });
    const payload: OrbitAuthResponse = {
      authenticated: true,
      user: toClientSession(user),
      preferences: user.preferences,
      syncedAt: user.preferences.updatedAt,
    };

    return applySessionCookie(successResponse(payload), {
      userId: user.id,
      version: user.sessionVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

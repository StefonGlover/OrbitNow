import { badRequest, errorResponse, successResponse } from "@/lib/server/api";
import {
  applySessionCookie,
  assertSessionSecretConfigured,
  authenticateUserRecord,
  validateCredentialInput,
} from "@/lib/server/auth";
import { toClientSession } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { OrbitAuthResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSessionSecretConfigured();
    await enforceRateLimit(request, {
      scope: "auth-login",
      maxRequests: 10,
      windowMs: 1000 * 60 * 15,
      message: "Too many sign-in attempts. Please wait a few minutes and try again.",
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
    const sessionUser = await authenticateUserRecord(email, password);

    const payload: OrbitAuthResponse = {
      authenticated: true,
      user: toClientSession(sessionUser),
      preferences: sessionUser.preferences,
      syncedAt: sessionUser.preferences.updatedAt,
    };

    return applySessionCookie(successResponse(payload), {
      userId: sessionUser.id,
      version: sessionUser.sessionVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

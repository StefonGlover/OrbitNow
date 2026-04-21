import { badRequest, errorResponse, successResponse } from "@/lib/server/api";
import {
  assertSessionSecretConfigured,
  hashPassword,
  validateResetPasswordInput,
} from "@/lib/server/auth";
import { consumePasswordResetToken, updateUserPassword } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { OrbitPasswordResetConfirmResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSessionSecretConfigured();
    await enforceRateLimit(request, {
      scope: "auth-reset-password",
      maxRequests: 5,
      windowMs: 1000 * 60 * 15,
      message: "Too many password reset attempts. Please wait a few minutes and try again.",
    });

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const { token, password } = validateResetPasswordInput(
      typeof body === "object" && body ? (body as Record<string, unknown>) : {},
    );
    const userId = await consumePasswordResetToken(token);

    if (!userId) {
      throw badRequest("That reset link is invalid or has expired.");
    }

    const passwordResult = hashPassword(password);
    const user = await updateUserPassword({
      userId,
      passwordHash: passwordResult.hash,
      passwordSalt: passwordResult.salt,
    });

    if (!user) {
      throw badRequest("The password reset could not be completed.");
    }

    const payload: OrbitPasswordResetConfirmResponse = {
      reset: true,
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

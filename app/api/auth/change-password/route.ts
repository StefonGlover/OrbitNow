import { badRequest, errorResponse, successResponse, unauthorized } from "@/lib/server/api";
import {
  assertSessionSecretConfigured,
  getSessionUserFromRequest,
  hashPassword,
  validatePasswordChangeInput,
  verifyPassword,
} from "@/lib/server/auth";
import { findUserById, updateUserPassword } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { OrbitAccountMutationResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSessionSecretConfigured();
    await enforceRateLimit(request, {
      scope: "auth-change-password",
      maxRequests: 8,
      windowMs: 1000 * 60 * 15,
      message: "Too many password change attempts. Please wait a few minutes and try again.",
    });

    const sessionUser = await getSessionUserFromRequest();

    if (!sessionUser) {
      throw unauthorized("Sign in to change your password.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const { currentPassword, nextPassword } = validatePasswordChangeInput(
      typeof body === "object" && body ? (body as Record<string, unknown>) : {},
    );
    const user = await findUserById(sessionUser.id);

    if (!user || !verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
      throw badRequest("Current password is incorrect.");
    }

    const passwordResult = hashPassword(nextPassword);
    const updatedUser = await updateUserPassword({
      userId: sessionUser.id,
      passwordHash: passwordResult.hash,
      passwordSalt: passwordResult.salt,
    });

    if (!updatedUser) {
      throw unauthorized("Your session is no longer valid. Please sign in again.");
    }

    const payload: OrbitAccountMutationResponse = {
      authenticated: false,
      user: null,
      message: "Password updated. Please sign in again with your new password.",
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

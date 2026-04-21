import { badRequest, errorResponse, successResponse } from "@/lib/server/api";
import {
  assertSessionSecretConfigured,
  validateEmailAddress,
} from "@/lib/server/auth";
import { createPasswordResetToken, findUserByEmail } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import type { OrbitPasswordResetRequestResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSessionSecretConfigured();
    await enforceRateLimit(request, {
      scope: "auth-forgot-password",
      maxRequests: 5,
      windowMs: 1000 * 60 * 15,
      message: "Too many reset attempts. Please wait a few minutes and try again.",
    });

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const email = validateEmailAddress(
      typeof body === "object" && body && "email" in body && typeof body.email === "string"
        ? body.email
        : undefined,
    );
    const user = await findUserByEmail(email);
    const tokenPayload = user ? await createPasswordResetToken(user.id) : null;
    const payload: OrbitPasswordResetRequestResponse = {
      accepted: true,
      ...(process.env.NODE_ENV !== "production" && tokenPayload
        ? {
            resetToken: tokenPayload.rawToken,
            resetUrl: `/reset-password?token=${tokenPayload.rawToken}`,
            expiresAt: tokenPayload.expiresAt,
          }
        : {}),
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

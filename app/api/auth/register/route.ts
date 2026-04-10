import { conflictError, errorResponse, badRequest, successResponse } from "@/lib/server/api";
import {
  applySessionCookie,
  hashPassword,
  validateCredentialInput,
} from "@/lib/server/auth";
import { createUserRecord, findUserByEmail, toClientSession } from "@/lib/server/db";
import type { OrbitAuthResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const { email, password } = validateCredentialInput(
      typeof body === "object" && body ? (body as Record<string, unknown>) : {},
    );

    if (await findUserByEmail(email)) {
      throw conflictError("An account with that email already exists.");
    }

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
      syncedAt: user.updatedAt,
    };

    return applySessionCookie(successResponse(payload), user.id);
  } catch (error) {
    return errorResponse(error);
  }
}

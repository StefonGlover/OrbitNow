import { getSessionUserFromRequest } from "@/lib/server/auth";
import { getUserPreferences, updateUserPreferences } from "@/lib/server/db";
import { badRequest, errorResponse, successResponse, unauthorized } from "@/lib/server/api";
import { validateOrbitPreferencesInput } from "@/lib/server/preferences-validation";
import type { OrbitPreferencesSyncResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      throw unauthorized("Sign in to sync your My Orbit settings.");
    }

    const preferences = await getUserPreferences(user.id);

    if (!preferences) {
      throw unauthorized("Your session is no longer valid. Please sign in again.");
    }

    const payload: OrbitPreferencesSyncResponse = {
      preferences,
      syncedAt: preferences.updatedAt,
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      throw unauthorized("Sign in to sync your My Orbit settings.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const rawPreferences =
      body && typeof body === "object" && "preferences" in body
        ? (body as { preferences: unknown }).preferences
        : body;

    if (rawPreferences === undefined) {
      throw badRequest("preferences is required.");
    }

    const nextPreferences = validateOrbitPreferencesInput(rawPreferences);
    const savedPreferences = await updateUserPreferences(user.id, nextPreferences);

    if (!savedPreferences) {
      throw unauthorized("Your session is no longer valid. Please sign in again.");
    }

    const payload: OrbitPreferencesSyncResponse = {
      preferences: savedPreferences,
      syncedAt: savedPreferences.updatedAt,
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getSessionUserFromRequest } from "@/lib/server/auth";
import { markDeliveredAlerts } from "@/lib/server/db";
import { badRequest, errorResponse, successResponse, unauthorized } from "@/lib/server/api";
import type { OrbitAlertsAckApiResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      throw unauthorized("Sign in to acknowledge OrbitNow alerts.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const rawKeys =
      body && typeof body === "object" && "keys" in body
        ? (body as { keys: unknown }).keys
        : null;

    if (!Array.isArray(rawKeys)) {
      throw badRequest("keys must be an array.");
    }

    const keys = rawKeys.map((key, index) => {
      if (typeof key !== "string" || key.trim().length === 0 || key.trim().length > 200) {
        throw badRequest(`keys[${index}] must be a non-empty string.`);
      }

      return key.trim();
    });

    await markDeliveredAlerts(user.id, Array.from(new Set(keys)));

    const payload: OrbitAlertsAckApiResponse = {
      acknowledged: keys.length,
    };

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

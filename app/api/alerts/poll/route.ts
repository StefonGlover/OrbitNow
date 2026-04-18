import { buildAlertsForPreferences } from "@/lib/server/alerts";
import { errorResponse, successResponse, unauthorized } from "@/lib/server/api";
import { getSessionUserFromRequest } from "@/lib/server/auth";
import { getUserAlertLedger, getUserPreferences } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      throw unauthorized("Sign in to receive OrbitNow alerts.");
    }

    const preferences = await getUserPreferences(user.id);

    if (!preferences) {
      throw unauthorized("Your session is no longer valid. Please sign in again.");
    }

    const ledger = await getUserAlertLedger(user.id);
    const payload = await buildAlertsForPreferences({
      userId: user.id,
      preferences,
      deliveredByKey: ledger.deliveredByKey,
    });

    return successResponse(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

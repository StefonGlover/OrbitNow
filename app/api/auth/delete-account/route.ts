import { errorResponse, successResponse, unauthorized } from "@/lib/server/api";
import { clearSessionCookie, getSessionUserFromRequest } from "@/lib/server/auth";
import { deleteUserRecord } from "@/lib/server/db";
import type { OrbitAccountMutationResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sessionUser = await getSessionUserFromRequest();

    if (!sessionUser) {
      throw unauthorized("Sign in to delete your account.");
    }

    await deleteUserRecord(sessionUser.id);

    const payload: OrbitAccountMutationResponse = {
      authenticated: false,
      user: null,
      message: "Your OrbitNow account has been deleted.",
    };

    return clearSessionCookie(successResponse(payload));
  } catch (error) {
    return errorResponse(error);
  }
}

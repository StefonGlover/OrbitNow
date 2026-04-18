import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { clearSessionCookie, getSessionUserFromRequest } from "@/lib/server/auth";
import { rotateUserSessionVersion } from "@/lib/server/db";
import type { OrbitAuthSessionResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);

    if (sessionUser) {
      await rotateUserSessionVersion(sessionUser.id);
    }

    const payload: OrbitAuthSessionResponse = {
      authenticated: false,
      user: null,
    };

    return clearSessionCookie(successResponse(payload));
  } catch (error) {
    return errorResponse(error);
  }
}

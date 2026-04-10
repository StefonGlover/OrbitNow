import { errorResponse, successResponse } from "@/lib/server/api";
import { clearSessionCookie } from "@/lib/server/auth";
import type { OrbitAuthSessionResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const payload: OrbitAuthSessionResponse = {
      authenticated: false,
      user: null,
    };

    return clearSessionCookie(successResponse(payload));
  } catch (error) {
    return errorResponse(error);
  }
}

import { errorResponse, successResponse } from "@/lib/server/api";
import { getSessionUserFromRequest } from "@/lib/server/auth";
import type { OrbitAuthSessionResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();
    const session: OrbitAuthSessionResponse = {
      authenticated: Boolean(user),
      user,
    };

    return successResponse(session);
  } catch (error) {
    return errorResponse(error);
  }
}

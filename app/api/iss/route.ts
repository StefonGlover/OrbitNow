import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchIssLocation } from "@/lib/space-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // The browser polls this local route instead of the third-party API directly.
    // That keeps the client contract stable and lets us centralize upstream handling.
    const iss = await fetchIssLocation();
    return successResponse(iss, {
      cacheSeconds: 5,
      staleWhileRevalidateSeconds: 10,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

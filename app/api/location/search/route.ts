import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { lookupLocations } from "@/lib/server/location";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, {
      scope: "location-search",
      maxRequests: 30,
      windowMs: 1000 * 60 * 15,
      message: "Location searches are coming in too quickly. Please try again shortly.",
    });

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const results = await lookupLocations(query);

    return successResponse(results, {
      cacheSeconds: 43_200,
      staleWhileRevalidateSeconds: 86_400,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

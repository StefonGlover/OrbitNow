import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { DEFAULT_OBSERVER, fetchVisiblePasses } from "@/lib/space-data";
import {
  parseLatitude,
  parseLongitude,
  parseOptionalNumber,
} from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const observerLat = parseLatitude(request.nextUrl.searchParams.get("lat"));
    const observerLng = parseLongitude(request.nextUrl.searchParams.get("lon"));

    const passes = await fetchVisiblePasses({
      observerLat,
      observerLng,
      observerAltKm: parseOptionalNumber(
        request.nextUrl.searchParams.get("alt"),
        DEFAULT_OBSERVER.altitudeKm,
        "alt",
        { min: 0 },
      ),
      days: parseOptionalNumber(request.nextUrl.searchParams.get("days"), 7, "days", {
        integer: true,
        min: 1,
        max: 10,
      }),
      minimumVisibilitySeconds: parseOptionalNumber(
        request.nextUrl.searchParams.get("minVisibility"),
        300,
        "minVisibility",
        { integer: true, min: 1, max: 3600 },
      ),
    });

    return successResponse(passes, {
      cacheSeconds: 300,
      staleWhileRevalidateSeconds: 600,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

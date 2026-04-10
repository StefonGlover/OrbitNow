import { NextRequest } from "next/server";
import { badRequest, errorResponse, successResponse } from "@/lib/server/api";
import { DEFAULT_OBSERVER, fetchSatellitePositions } from "@/lib/space-data";
import { parseOptionalNumber, parseRequiredNumber } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    norad: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const noradId = parseRequiredNumber(context.params.norad, "norad", {
      integer: true,
      min: 1,
    });
    const observerLat = parseOptionalNumber(
      request.nextUrl.searchParams.get("lat"),
      DEFAULT_OBSERVER.latitude,
      "lat",
      { min: -90, max: 90 },
    );
    const observerLng = parseOptionalNumber(
      request.nextUrl.searchParams.get("lon"),
      DEFAULT_OBSERVER.longitude,
      "lon",
      { min: -180, max: 180 },
    );
    const observerAltKm = parseOptionalNumber(
      request.nextUrl.searchParams.get("alt"),
      DEFAULT_OBSERVER.altitudeKm,
      "alt",
      { min: 0 },
    );
    const seconds = parseOptionalNumber(
      request.nextUrl.searchParams.get("seconds"),
      120,
      "seconds",
      { integer: true, min: 1, max: 300 },
    );

    if (!Number.isInteger(noradId)) {
      throw badRequest("norad must be a whole number.");
    }

    const satellite = await fetchSatellitePositions({
      noradId,
      observerLat,
      observerLng,
      observerAltKm,
      seconds,
    });

    return successResponse(satellite, {
      cacheSeconds: 15,
      staleWhileRevalidateSeconds: 45,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

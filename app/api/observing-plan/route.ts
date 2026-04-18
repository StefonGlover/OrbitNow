import { NextRequest } from "next/server";
import { buildObservingPlan } from "@/lib/observing-plan";
import { errorResponse, successResponse } from "@/lib/server/api";
import { parseLatitude, parseLongitude } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const latitude = parseLatitude(request.nextUrl.searchParams.get("lat"));
    const longitude = parseLongitude(request.nextUrl.searchParams.get("lon"));
    const label = request.nextUrl.searchParams.get("label");

    const plan = await buildObservingPlan({
      latitude,
      longitude,
      locationName: label,
    });

    return successResponse(plan, {
      cacheSeconds: 300,
      staleWhileRevalidateSeconds: 900,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

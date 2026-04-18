import { NextRequest } from "next/server";
import { fetchUpcomingLaunches } from "@/lib/space-data";
import { errorResponse, successResponse } from "@/lib/server/api";
import { parseOptionalNumber } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = parseOptionalNumber(
      request.nextUrl.searchParams.get("limit"),
      4,
      "limit",
      {
        integer: true,
        min: 1,
        max: 8,
      },
    );

    const missions = await fetchUpcomingLaunches(limit);

    return successResponse(missions, {
      cacheSeconds: 300,
      staleWhileRevalidateSeconds: 900,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

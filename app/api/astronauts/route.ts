import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchPeopleInSpace } from "@/lib/space-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const astronauts = await fetchPeopleInSpace();

    return successResponse(astronauts, {
      cacheSeconds: 60,
      staleWhileRevalidateSeconds: 120,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

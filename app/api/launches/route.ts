import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchNextLaunch } from "@/lib/space-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const launch = await fetchNextLaunch();
    return successResponse(launch, {
      cacheSeconds: 300,
      staleWhileRevalidateSeconds: 600,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

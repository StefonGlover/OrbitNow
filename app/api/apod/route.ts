import { successResponse } from "@/lib/server/api";
import {
  createApodFallback,
  fetchAstronomyPictureOfTheDay,
} from "@/lib/space-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apod = await fetchAstronomyPictureOfTheDay();

    return successResponse(apod, {
      cacheSeconds: 86400,
      staleWhileRevalidateSeconds: 43200,
    });
  } catch {
    return successResponse(createApodFallback(), {
      cacheSeconds: 900,
      staleWhileRevalidateSeconds: 1800,
    });
  }
}

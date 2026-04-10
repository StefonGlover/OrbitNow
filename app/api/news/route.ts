import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchLatestSpaceNews } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await fetchLatestSpaceNews();

    return successResponse(news, {
      cacheSeconds: 600,
      staleWhileRevalidateSeconds: 1_800,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

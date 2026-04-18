import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchLatestSpaceNews } from "@/lib/news";
import { normalizeOrbitNewsTopics } from "@/lib/orbit-preferences";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getSessionUserFromRequest } from "@/lib/server/auth";
import { getUserPreferences } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    enforceRateLimit(request, {
      scope: "ai-news-intelligence",
      maxRequests: 30,
      windowMs: 1000 * 60 * 15,
      message: "News intelligence requests are coming in too quickly. Please try again shortly.",
    });

    const topicsParam = request.nextUrl.searchParams.get("topics");
    const sessionUser = topicsParam ? null : await getSessionUserFromRequest(request);
    const syncedPreferences = sessionUser
      ? await getUserPreferences(sessionUser.id)
      : null;
    const preferredTopics = topicsParam
      ? normalizeOrbitNewsTopics(topicsParam.split(","))
      : syncedPreferences?.newsTopics ?? [];
    const news = await fetchLatestSpaceNews({
      preferredTopics,
    });

    return successResponse(news, {
      cacheSeconds: 600,
      staleWhileRevalidateSeconds: 1_800,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

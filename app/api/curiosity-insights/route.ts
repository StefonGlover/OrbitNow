import { NextRequest } from "next/server";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import {
  createFallbackCuriosityInsights,
  generateCuriosityInsights,
} from "@/lib/openai";
import { errorResponse, successResponse } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, {
      scope: "ai-curiosity-insights",
      maxRequests: 30,
      windowMs: 1000 * 60 * 15,
      message: "Curiosity insight requests are coming in too quickly. Please try again shortly.",
    });

    const context = await fetchAiDashboardContext();

    const insights = await generateCuriosityInsights(context).catch(() =>
      createFallbackCuriosityInsights(context),
    );

    return successResponse(insights, {
      cacheSeconds: 1_800,
      staleWhileRevalidateSeconds: 3_600,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

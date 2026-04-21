import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import { createFallbackMissionBrief, generateMissionBrief } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, {
      scope: "ai-mission-brief",
      maxRequests: 30,
      windowMs: 1000 * 60 * 15,
      message: "Mission brief requests are coming in too quickly. Please try again shortly.",
    });

    const context = await fetchAiDashboardContext();

    const missionBrief = await generateMissionBrief(context).catch(() =>
      createFallbackMissionBrief(context),
    );

    return successResponse(missionBrief, {
      cacheSeconds: 900,
      staleWhileRevalidateSeconds: 1800,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

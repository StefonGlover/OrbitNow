import { successResponse } from "@/lib/server/api";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import { createFallbackMissionBrief, generateMissionBrief } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await fetchAiDashboardContext();

  const missionBrief = await generateMissionBrief(context).catch(() =>
    createFallbackMissionBrief(context),
  );

  return successResponse(missionBrief, {
    cacheSeconds: 900,
    staleWhileRevalidateSeconds: 1800,
  });
}

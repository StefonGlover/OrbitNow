import { fetchAiDashboardContext } from "@/lib/ai-context";
import {
  createFallbackCuriosityInsights,
  generateCuriosityInsights,
} from "@/lib/openai";
import { successResponse } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await fetchAiDashboardContext();

  const insights = await generateCuriosityInsights(context).catch(() =>
    createFallbackCuriosityInsights(context),
  );

  return successResponse(insights, {
    cacheSeconds: 1_800,
    staleWhileRevalidateSeconds: 3_600,
  });
}

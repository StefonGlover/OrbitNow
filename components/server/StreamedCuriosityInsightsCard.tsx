import { CuriosityInsightsCard } from "@/components/CuriosityInsightsCard";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import {
  createFallbackCuriosityInsights,
  generateCuriosityInsights,
} from "@/lib/openai";

export async function StreamedCuriosityInsightsCard() {
  const context = await fetchAiDashboardContext();

  const initialData = await generateCuriosityInsights(context).catch(() =>
    createFallbackCuriosityInsights(context),
  );

  return <CuriosityInsightsCard initialData={initialData} />;
}

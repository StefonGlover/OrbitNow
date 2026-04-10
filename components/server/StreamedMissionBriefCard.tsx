import { MissionBriefCard } from "@/components/MissionBriefCard";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import { createFallbackMissionBrief, generateMissionBrief } from "@/lib/openai";

export async function StreamedMissionBriefCard() {
  const context = await fetchAiDashboardContext();

  const initialData = await generateMissionBrief(context).catch(() =>
    createFallbackMissionBrief(context),
  );

  return <MissionBriefCard initialData={initialData} />;
}

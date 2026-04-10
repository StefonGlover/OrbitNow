import { SectionCard } from "@/components/SectionCard";

export function MissionBriefCardFallback() {
  return (
    <SectionCard
      title="AI Mission Brief"
      eyebrow="Dynamic Insight"
      description="Streaming the AI briefing separately so the rest of the dashboard stays fast."
      className="ui-card-feature md:col-span-2 xl:col-span-4"
      isLoading
      loadingLabel="Streaming"
    >
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </SectionCard>
  );
}

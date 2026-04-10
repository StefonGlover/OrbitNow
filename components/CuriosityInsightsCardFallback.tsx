import { SectionCard } from "@/components/SectionCard";

export function CuriosityInsightsCardFallback() {
  return (
    <SectionCard
      title="AI Curiosity Sparks"
      eyebrow="Did You Know?"
      description="Streaming curiosity-driven insights separately so the dashboard can stay responsive."
      className="ui-card-feature md:col-span-2 xl:col-span-2"
      isLoading
      loadingLabel="Streaming"
    >
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </SectionCard>
  );
}

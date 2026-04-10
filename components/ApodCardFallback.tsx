import { SectionCard } from "@/components/SectionCard";

export function ApodCardFallback() {
  return (
    <SectionCard
      title="Astronomy Picture of the Day"
      eyebrow="Daily Feature"
      description="Loading today's NASA feature in a streamed section."
      className="md:col-span-2 xl:col-span-6"
      isLoading
      loadingLabel="Streaming"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:grid-cols-[minmax(0,1.38fr)_minmax(360px,0.8fr)]">
        <div className="h-80 animate-pulse rounded-3xl bg-white/5 xl:h-[28rem]" />
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </SectionCard>
  );
}

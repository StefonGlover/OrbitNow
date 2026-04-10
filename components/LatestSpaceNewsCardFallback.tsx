import { SectionCard } from "@/components/SectionCard";

export function LatestSpaceNewsCardFallback() {
  return (
    <SectionCard
      title="Latest Space News"
      eyebrow="Intelligence Feed"
      description="Streaming recent space reporting and the AI current brief into a dedicated lower dashboard section."
      className="md:col-span-2 xl:col-span-6"
      isLoading
      loadingLabel="Streaming"
    >
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.16fr)_minmax(340px,0.84fr)]">
          <div className="h-80 animate-pulse rounded-[28px] bg-white/5" />
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-44 animate-pulse rounded-2xl bg-white/5" key={index} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

"use client";

import { useEffect } from "react";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import { formatDateTime } from "@/lib/formatters";
import { MissionBriefApiResponse } from "@/lib/types";

type MissionBriefCardProps = {
  initialData?: MissionBriefApiResponse | null;
};

export function MissionBriefCard({
  initialData = null,
}: MissionBriefCardProps) {
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<MissionBriefApiResponse>("/api/mission-brief", 900_000, {
    initialData,
  });
  const isBusy = isLoading || isRefreshing;

  useEffect(() => {
    if (!error || data) {
      return;
    }

    const retryId = window.setTimeout(() => {
      void refresh();
    }, 60_000);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [data, error, refresh]);

  return (
    <SectionCard
      title="AI Mission Brief"
      eyebrow="Dynamic Insight"
      description="A live OpenAI-generated briefing built from the current orbital dashboard data."
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
      className="ui-card-feature md:col-span-2 xl:col-span-4"
      isLoading={isBusy}
      loadingLabel={isLoading ? "Loading" : "Refreshing Insight"}
    >
      {isLoading && !data ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Dynamic Insight is waiting on upstream space data. OrbitNow will retry automatically in about 60 seconds.
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="ui-panel ui-panel-feature p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="ui-kicker text-cyan-100/80">
                {data.briefing.title}
              </p>
              <span className="ui-chip ui-chip-live">AI insight</span>
            </div>
            <p className="mt-4 text-base leading-8 text-white sm:text-[1.05rem]">
              {data.briefing.summary}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
              Generated {formatDateTime(data.generatedAt)} • {data.model}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.briefing.dataPoints.map((point) => (
              <div
                className="ui-panel"
                key={`${point.label}-${point.value}`}
              >
                <p className="ui-label">
                  {point.label}
                </p>
                <p className="mt-3 text-sm font-medium text-white">{point.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="ui-panel">
              <p className="ui-label">
                Highlights
              </p>
              <div className="mt-4 grid gap-3">
                {data.briefing.highlights.map((highlight) => (
                  <p className="text-sm leading-7 text-slate-200" key={highlight}>
                    {highlight}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="ui-panel">
                <p className="ui-label">
                  Watch Now
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {data.briefing.watchNow}
                </p>
              </div>

              <div className="ui-panel">
                <p className="ui-label">
                  Next Steps
                </p>
                <div className="mt-3 grid gap-2">
                  {data.briefing.nextSteps.map((step) => (
                    <p className="text-sm leading-7 text-slate-200" key={step}>
                      {step}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isRefreshing ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing AI briefing...
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

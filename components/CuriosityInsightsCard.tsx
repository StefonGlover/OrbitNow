"use client";

import { useEffect } from "react";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import { CuriosityInsightsApiResponse } from "@/lib/types";

type CuriosityInsightsCardProps = {
  initialData?: CuriosityInsightsApiResponse | null;
};

export function CuriosityInsightsCard({
  initialData = null,
}: CuriosityInsightsCardProps) {
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<CuriosityInsightsApiResponse>("/api/curiosity-insights", 1_800_000, {
    initialData,
  });
  const isBusy = isLoading || isRefreshing;

  useEffect(() => {
    if (!error || data) {
      return;
    }

    const retryId = window.setTimeout(() => {
      void refresh();
    }, 45_000);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [data, error, refresh]);

  return (
    <SectionCard
      title="AI Curiosity Sparks"
      eyebrow="Did You Know?"
      description="Short, high-signal space facts generated from the live dashboard snapshot."
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
      className="ui-card-feature md:col-span-2 xl:col-span-2"
      isLoading={isBusy}
      loadingLabel={isLoading ? "Loading" : "Refreshing Insight"}
    >
      {isLoading && !data ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Curiosity Sparks is waiting on fresh AI output. OrbitNow will retry automatically in about 45 seconds.
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.insights.map((item) => (
            <div
              className="ui-panel p-4"
              key={item.title}
            >
              <p className="ui-label text-cyan-200/80">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-white">{item.insight}</p>
              <p className="mt-3 text-sm text-slate-300">{item.whyItMatters}</p>
            </div>
          ))}

          {isRefreshing ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing curiosity prompts...
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

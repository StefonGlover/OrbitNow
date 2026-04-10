"use client";

import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import { PeopleInSpaceApiResponse } from "@/lib/types";

type PeopleInSpaceCardProps = {
  initialData?: PeopleInSpaceApiResponse | null;
};

export function PeopleInSpaceCard({ initialData = null }: PeopleInSpaceCardProps) {
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<PeopleInSpaceApiResponse>("/api/astronauts", 60_000, {
    initialData,
  });

  return (
    <SectionCard
      title="People in Space"
      eyebrow="Crew Snapshot"
      description="Names and spacecraft are served from our proxy route."
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
      className="xl:col-span-2"
      isLoading={isLoading || isRefreshing}
      loadingLabel={isLoading ? "Loading" : "Refreshing Crew"}
    >
      {isLoading && !data ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="ui-panel ui-panel-feature p-5">
            <p className="ui-label">
              Total People
            </p>
            <p className="ui-metric mt-3">
              {data.totalPeople}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Humanity is currently distributed across active orbital missions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.people.map((person) => (
              <div
                className="ui-panel flex items-center justify-between gap-3 px-4 py-3"
                key={`${person.name}-${person.craft}`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{person.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{person.craft}</p>
                </div>
                <span className="ui-chip">{person.craft}</span>
              </div>
            ))}
          </div>

          {isRefreshing ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing crew manifest...
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

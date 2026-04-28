"use client";

import Link from "next/link";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { usePollingJson } from "@/hooks/usePollingJson";
import {
  formatDateTimeWithPreferences,
  formatRelativeFuture,
} from "@/lib/formatters";
import type { UpcomingLaunchesApiResponse } from "@/lib/types";

export function MissionDeckCard() {
  const { preferences, saveFavoriteObject } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<UpcomingLaunchesApiResponse>("/api/missions?limit=4", 300_000);

  return (
    <SectionCard
      title="Mission Deck"
      eyebrow="Upcoming Missions"
      description="A broader look at the next missions on the board, each with a dedicated detail page and quick-save access."
      className="md:col-span-2 xl:col-span-2"
      isLoading={isLoading || isRefreshing}
      loadingLabel={isLoading ? "Loading" : "Refreshing Missions"}
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
    >
      {isLoading && !data ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.launches.slice(0, 4).map((mission) => (
            <div className="ui-panel p-4" key={mission.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="ui-chip">{mission.status}</span>
                    {mission.missionType ? (
                      <span className="ui-chip">{mission.missionType}</span>
                    ) : null}
                    {mission.orbit ? <span className="ui-chip">{mission.orbit}</span> : null}
                  </div>
                  <p className="mt-3 text-base font-semibold text-white">{mission.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {mission.provider}
                    {mission.rocket ? ` • ${mission.rocket}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-cyan-200">
                    {formatDateTimeWithPreferences(
                      mission.net,
                      preferences.display,
                      homeTimeZone,
                    )}{" "}
                    • {formatRelativeFuture(mission.net)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="ui-btn-secondary rounded-[18px] px-4 py-2.5 text-sm"
                    onClick={() =>
                      saveFavoriteObject({
                        id: `launch-${mission.id}`,
                        type: "launch",
                        label: mission.name,
                        subtitle: mission.provider,
                      })
                    }
                    type="button"
                  >
                    Save
                  </button>
                  <Link
                    className="ui-btn-secondary rounded-[18px] px-4 py-2.5 text-sm"
                    href={`/missions/${mission.id}`}
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

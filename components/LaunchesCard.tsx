"use client";

import Link from "next/link";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import {
  formatDateTimeWithPreferences,
  formatRelativeFuture,
} from "@/lib/formatters";
import { LaunchesApiResponse } from "@/lib/types";

type LaunchesCardProps = {
  initialData?: LaunchesApiResponse | null;
};

export function LaunchesCard({ initialData = null }: LaunchesCardProps) {
  const { preferences, saveFavoriteObject } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<LaunchesApiResponse>("/api/launches", 300_000, {
    initialData,
  });
  const isBusy = isLoading || isRefreshing;

  return (
    <SectionCard
      title="Next Launch"
      eyebrow="Launch Window"
      description="Upcoming launch data proxied from Launch Library 2."
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {data ? (
            <Link
              className="ui-btn-secondary"
              href={`/missions/${data.launch.id}`}
            >
              Mission details
            </Link>
          ) : null}
          {data ? (
            <button
              className="ui-btn-secondary"
              onClick={() =>
                saveFavoriteObject({
                  id: `launch-${data.launch.id}`,
                  type: "launch",
                  label: data.launch.name,
                  subtitle: data.launch.provider,
                })
              }
              type="button"
            >
              Save mission
            </button>
          ) : null}
          <CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />
        </div>
      }
      className="xl:col-span-2"
      isLoading={isBusy}
      loadingLabel={isLoading ? "Loading" : "Refreshing Launch"}
    >
      {isLoading && !data ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="ui-panel ui-panel-feature p-5">
            <p className="ui-label">
              Launch
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {data.launch.name}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {data.launch.provider}
              {data.launch.rocket ? ` • ${data.launch.rocket}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ui-panel">
              <p className="ui-label">
                NET
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {formatDateTimeWithPreferences(
                  data.launch.net,
                  preferences.display,
                  homeTimeZone,
                )}
              </p>
              <p className="mt-1 text-sm text-cyan-200">
                {formatRelativeFuture(data.launch.net)}
              </p>
            </div>
            <div className="ui-panel">
              <p className="ui-label">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {data.launch.status}
              </p>
              {data.launch.locationName ? (
                <p className="mt-1 text-sm text-slate-300">
                  {data.launch.locationName}
                </p>
              ) : null}
            </div>
          </div>

          {data.launch.missionDescription ? (
            <div className="ui-panel text-sm text-slate-300">
              {data.launch.missionDescription}
            </div>
          ) : null}

          {isRefreshing ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing launch window...
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

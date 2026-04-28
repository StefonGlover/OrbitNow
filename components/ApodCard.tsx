"use client";

import { useEffect, useState } from "react";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import { formatDateTime } from "@/lib/formatters";
import { ApodApiResponse } from "@/lib/types";

type ApodCardProps = {
  initialData?: ApodApiResponse | null;
};

export function ApodCard({ initialData = null }: ApodCardProps) {
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<ApodApiResponse>("/api/apod", 86_400_000, {
    initialData,
  });
  const isBusy = isLoading || isRefreshing;
  const [hasImageError, setHasImageError] = useState(false);
  const fullResolutionUrl =
    data?.item.hdImageUrl ?? data?.item.imageUrl ?? null;
  const primaryAssetLabel =
    data?.item.mediaType === "image" && data.item.hdImageUrl
      ? "Open full resolution"
      : "Open NASA feature";
  const shouldShowNasaAssetLink =
    Boolean(data?.item.imageUrl) && fullResolutionUrl !== data?.item.imageUrl;

  useEffect(() => {
    if (!error || data) {
      return;
    }

    const retryId = window.setTimeout(() => {
      void refresh();
    }, 30_000);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [data, error, refresh]);

  useEffect(() => {
    setHasImageError(false);
  }, [data?.item.imageUrl]);

  return (
    <SectionCard
      title="Astronomy Picture of the Day"
      eyebrow="Daily Feature"
      description="NASA APOD, refreshed once per day through our server-side route."
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
      className="md:col-span-2 xl:col-span-6"
      isLoading={isBusy}
      loadingLabel={isLoading ? "Loading" : "Refreshing APOD"}
    >
      {isLoading && !data ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:grid-cols-[minmax(0,1.38fr)_minmax(360px,0.8fr)]">
          <div className="h-80 animate-pulse rounded-3xl bg-white/5 xl:h-[28rem]" />
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          APOD is slow right now. OrbitNow will retry automatically in about 30 seconds.
        </div>
      ) : data ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,0.8fr)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {data.item.mediaType === "image" && !hasImageError ? (
              // NASA APOD media can originate from different remote hosts, so this
              // stays as a standard image instead of a constrained Next image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={data.item.title}
                className="h-full max-h-[560px] w-full object-cover xl:max-h-[620px]"
                onError={() => setHasImageError(true)}
                src={data.item.imageUrl}
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center bg-white/5 p-6 text-center text-sm text-slate-300">
                {hasImageError
                  ? "The APOD image could not be loaded from NASA right now. Open the NASA asset directly to view it."
                  : `This APOD entry is a ${data.item.mediaType}. Open the NASA asset to view it.`}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="ui-panel ui-panel-feature p-5">
              <p className="ui-label">
                Today&apos;s Entry
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {data.item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {formatDateTime(data.item.date)}
              </p>
              {data.item.copyright ? (
                <p className="mt-1 text-sm text-slate-400">
                  Credit: {data.item.copyright}
                </p>
              ) : null}
            </div>

            <div className="ui-panel text-sm leading-7 text-slate-300">
              {data.item.explanation}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                className="ui-btn-primary"
                href={fullResolutionUrl ?? "#"}
                rel="noreferrer"
                target="_blank"
              >
                {primaryAssetLabel}
              </a>
              {shouldShowNasaAssetLink ? (
                <a
                  className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                  href={data.item.imageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open NASA asset
                </a>
              ) : null}
            </div>

            {isRefreshing ? (
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
                Refreshing today&apos;s NASA feature...
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

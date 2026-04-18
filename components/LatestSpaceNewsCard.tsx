"use client";

import { useEffect, useState } from "react";
import { CardRefreshButton } from "@/components/CardRefreshButton";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { SectionCard } from "@/components/SectionCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import {
  formatDateTimeWithPreferences,
  formatRelativeTime,
} from "@/lib/formatters";
import { LatestSpaceNewsApiResponse } from "@/lib/types";

type LatestSpaceNewsCardProps = {
  initialData?: LatestSpaceNewsApiResponse | null;
};

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function StoryImage({
  imageUrl,
  title,
  className,
}: {
  imageUrl: string | null;
  title: string;
  className: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (!imageUrl || hasImageError) {
    return (
      <div
        aria-hidden="true"
        className={`${className} flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_42%),linear-gradient(180deg,rgba(7,12,25,0.94),rgba(5,8,18,0.88))]`}
      >
        <span className="ui-chip">No image available</span>
      </div>
    );
  }

  return (
    // Remote news images come from many publishers, so this stays as a standard
    // image rather than relying on Next image host configuration.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={title}
      className={className}
      onError={() => setHasImageError(true)}
      src={imageUrl}
    />
  );
}

export function LatestSpaceNewsCard({
  initialData = null,
}: LatestSpaceNewsCardProps) {
  const { preferences } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(
    initialData?.featuredStory?.id ?? null,
  );
  const newsUrl = preferences.newsTopics.length
    ? `/api/news?topics=${preferences.newsTopics.join(",")}`
    : "/api/news";
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = usePollingJson<LatestSpaceNewsApiResponse>(newsUrl, 600_000, {
    initialData,
    revalidateOnMount: true,
  });
  const isBusy = isLoading || isRefreshing;
  const stories = data?.featuredStory
    ? [data.featuredStory, ...data.articles]
    : data?.articles ?? [];
  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ?? stories[0] ?? null;
  const selectedStoryIndex = selectedStory
    ? stories.findIndex((story) => story.id === selectedStory.id)
    : -1;
  const canFlipStories = stories.length > 1;

  useEffect(() => {
    if (!error || data) {
      return;
    }

    const retryId = window.setTimeout(() => {
      void refresh();
    }, 120_000);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [data, error, refresh]);

  useEffect(() => {
    const latestStories = data?.featuredStory
      ? [data.featuredStory, ...data.articles]
      : data?.articles ?? [];

    if (latestStories.length === 0) {
      if (selectedStoryId !== null) {
        setSelectedStoryId(null);
      }
      return;
    }

    const hasSelectedStory = latestStories.some(
      (story) => story.id === selectedStoryId,
    );
    if (!hasSelectedStory) {
      setSelectedStoryId(latestStories[0].id);
    }
  }, [data, selectedStoryId]);

  function selectStoryByOffset(offset: number) {
    if (!selectedStory || stories.length === 0) {
      return;
    }

    const nextIndex =
      (selectedStoryIndex + offset + stories.length) % stories.length;
    setSelectedStoryId(stories[nextIndex]?.id ?? selectedStory.id);
  }

  return (
    <SectionCard
      title="Latest Space News"
      eyebrow="Intelligence Feed"
      description="Recent space reporting, normalized server-side and elevated with an OpenAI current-awareness briefing."
      action={<CardRefreshButton isLoading={isRefreshing} onRefresh={refresh} />}
      className="md:col-span-2 xl:col-span-6"
      isLoading={isBusy}
      loadingLabel={isLoading ? "Loading" : "Refreshing Intelligence"}
    >
      {isLoading && !data ? (
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
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error} OrbitNow will retry the intelligence feed automatically in about 2 minutes.
        </div>
      ) : data && selectedStory ? (
        <div className="space-y-5">
          {preferences.newsTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {preferences.newsTopics.map((topic) => (
                <span className="ui-chip" key={topic}>
                  {topic.replace("-", " ")}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(340px,0.84fr)]">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <a
                className="group block"
                href={selectedStory.url}
                rel="noreferrer"
              >
                <div className="relative">
                  <StoryImage
                    className="h-[300px] w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-[360px] xl:h-[400px]"
                    imageUrl={selectedStory.imageUrl}
                    title={selectedStory.title}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ui-chip ui-chip-live">
                        {selectedStory.id === data.featuredStory?.id
                          ? "Top story"
                          : `Story ${selectedStoryIndex + 1}`}
                      </span>
                      <span className="ui-chip">{selectedStory.source}</span>
                      <span className="ui-chip">
                        {selectedStoryIndex + 1} / {stories.length}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">
                      {selectedStory.title}
                    </h3>
                  </div>
                </div>
              </a>

              {canFlipStories ? (
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Flip through the live story stack
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Show previous story"
                      className="ui-btn-secondary"
                      onClick={() => selectStoryByOffset(-1)}
                      type="button"
                    >
                      Previous
                    </button>
                    <button
                      aria-label="Show next story"
                      className="ui-btn-secondary"
                      onClick={() => selectStoryByOffset(1)}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="ui-panel ui-panel-feature p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ui-chip ui-chip-live">AI current brief</span>
                  <span className="ui-chip">{data.intelligence.model}</span>
                </div>
                <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
                  {data.intelligence.title}
                </p>
                <p className="mt-4 text-base leading-8 text-white">
                  {data.intelligence.summary}
                </p>
                <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="ui-label text-cyan-100/75">Why Now</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    {data.intelligence.whyNow}
                  </p>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                  Generated{" "}
                  {formatDateTimeWithPreferences(
                    data.intelligence.generatedAt,
                    preferences.display,
                    homeTimeZone,
                  )}{" "}
                  •{" "}
                  {data.featuredStory?.source ?? selectedStory.source}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
                {data.intelligence.signals.map((signal) => (
                  <div className="ui-panel" key={`${signal.label}-${signal.value}`}>
                    <p className="ui-label">{signal.label}</p>
                    <p className="mt-3 text-sm font-medium text-white">{signal.value}</p>
                  </div>
                ))}
              </div>

              <div className="ui-panel">
                <p className="ui-label">Watch List</p>
                <div className="mt-3 grid gap-2">
                  {data.intelligence.watchList.map((item) => (
                    <p className="text-sm leading-7 text-slate-200" key={item}>
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="ui-panel">
                  <p className="ui-label">Story Timestamp</p>
                  <p className="mt-3 text-sm font-medium text-white">
                    {formatRelativeTime(selectedStory.publishedAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatDateTimeWithPreferences(
                      selectedStory.publishedAt,
                      preferences.display,
                      homeTimeZone,
                    )}
                  </p>
                </div>
                <div className="ui-panel">
                  <p className="ui-label">Feed Updated</p>
                  <p className="mt-3 text-sm font-medium text-white">
                    {formatDateTimeWithPreferences(
                      data.fetchedAt,
                      preferences.display,
                      homeTimeZone,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{data.source}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  className="ui-btn-primary"
                  href={selectedStory.url}
                  rel="noreferrer"
                >
                  Open story
                </a>
                {selectedStory.authorNames.length > 0 ? (
                  <div className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    By {selectedStory.authorNames.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {data.articles.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.articles.map((article) => (
                <a
                  className="ui-panel block overflow-hidden hover:border-cyan-300/20 hover:bg-white/[0.065]"
                  href={article.url}
                  key={article.id}
                  rel="noreferrer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ui-chip">{article.source}</span>
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {formatRelativeTime(article.publishedAt)}
                    </span>
                  </div>
                  <h4 className="mt-4 text-base font-semibold leading-7 text-white">
                    {article.title}
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {truncateText(article.summary, 138)}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    {formatDateTimeWithPreferences(
                      article.publishedAt,
                      preferences.display,
                      homeTimeZone,
                    )}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="ui-panel border-dashed text-sm text-slate-300">
              No additional recent stories were returned right now. The featured top
              story is still available above.
            </div>
          )}

          {isRefreshing ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing AI news intelligence...
            </p>
          ) : null}
        </div>
      ) : (
        <div className="ui-panel border-dashed text-sm text-slate-300">
          No recent space headlines are available right now. Try refreshing in a moment.
        </div>
      )}
    </SectionCard>
  );
}

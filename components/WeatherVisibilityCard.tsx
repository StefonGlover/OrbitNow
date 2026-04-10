"use client";

import { FormEvent, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { useHomeLocationFields } from "@/hooks/useHomeLocationFields";
import {
  formatCoordinate,
  formatDateTimeWithPreferences,
} from "@/lib/formatters";
import { ApiRouteResponse, ViewingConditionsApiResponse } from "@/lib/types";

const inputClassName =
  "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

type WeatherVisibilityCardProps = {
  enabled: boolean;
};

export function WeatherVisibilityCard({ enabled }: WeatherVisibilityCardProps) {
  const { preferences } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const {
    latitude,
    longitude,
    setLatitude,
    setLongitude,
    hasHomeLocation,
    applyHomeLocation,
  } = useHomeLocationFields({
    fallbackLatitude: "40.7128",
    fallbackLongitude: "-74.0060",
  });
  const [result, setResult] = useState<ViewingConditionsApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ lat: latitude, lon: longitude });

    try {
      const response = await fetch(`/api/weather?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as ApiRouteResponse<ViewingConditionsApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to fetch viewing guidance." : json.error.message,
        );
      }

      setResult(json.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to fetch viewing guidance.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard
      title="Viewing Conditions"
      eyebrow="AI Sky Brief"
      description="AI-generated skywatching guidance from your location and live orbital context. It can reuse your My Orbit home base and does not use live weather measurements."
      className="md:col-span-2 xl:col-span-2"
      isLoading={isLoading}
      loadingLabel="Checking"
    >
      {!enabled ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Add `OPENAI_API_KEY` in `.env.local` to enable the AI sky brief.
        </div>
      ) : (
        <div className="space-y-5">
          <form
            className="ui-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={handleSubmit}
          >
            <div>
              <label className={labelClassName} htmlFor="weatherLatitude">
                Latitude
              </label>
              <input
                className={inputClassName}
                id="weatherLatitude"
                onChange={(event) => setLatitude(event.target.value)}
                value={latitude}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="weatherLongitude">
                Longitude
              </label>
              <input
                className={inputClassName}
                id="weatherLongitude"
                onChange={(event) => setLongitude(event.target.value)}
                value={longitude}
              />
            </div>
            {hasHomeLocation ? (
              <button
                className="ui-btn-secondary mt-auto h-[52px]"
                onClick={applyHomeLocation}
                type="button"
              >
                Use My Orbit
              </button>
            ) : null}
            <button
              className="ui-btn-primary mt-auto h-[52px]"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Generating..." : "Get AI brief"}
            </button>
          </form>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {isLoading && result ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing AI sky brief...
            </p>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="ui-panel ui-panel-feature p-5">
                <p className="ui-label">
                  Location
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {result.locationName}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatCoordinate(result.latitude, "N", "S")} •{" "}
                  {formatCoordinate(result.longitude, "E", "W")}
                </p>
                <p className="mt-4 text-sm leading-7 text-white">
                  {result.skySummary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="ui-panel">
                  <p className="ui-label">
                    Viewing Outlook
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white">
                    {result.viewingOutlook}
                  </p>
                </div>
                <div className="ui-panel">
                  <p className="ui-label">
                    Recommended Action
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white">
                    {result.recommendedAction}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {result.factors.map((factor) => (
                  <div className="ui-panel" key={`${factor.label}-${factor.value}`}>
                    <p className="ui-label">{factor.label}</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {factor.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="ui-panel text-sm text-slate-300">
                Generated{" "}
                {formatDateTimeWithPreferences(
                  result.generatedAt,
                  preferences.display,
                  homeTimeZone,
                )}{" "}
                • {result.confidenceNote}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

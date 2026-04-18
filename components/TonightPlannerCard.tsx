"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { useHomeLocationFields } from "@/hooks/useHomeLocationFields";
import {
  formatCoordinate,
  formatDateTimeWithPreferences,
  formatRelativeFuture,
} from "@/lib/formatters";
import type { ApiRouteResponse, ObservingPlanApiResponse } from "@/lib/types";

const inputClassName = "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

export function TonightPlannerCard() {
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
  const [result, setResult] = useState<ObservingPlanApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoLoadedRef = useRef(false);

  async function fetchPlanner() {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: latitude,
      lon: longitude,
    });

    if (preferences.homeLocation?.label) {
      params.set("label", preferences.homeLocation.label);
    }

    try {
      const response = await fetch(`/api/observing-plan?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as ApiRouteResponse<ObservingPlanApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to build the tonight planner." : json.error.message,
        );
      }

      setResult(json.data);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to build the tonight planner.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchPlanner();
  }

  useEffect(() => {
    if (!hasHomeLocation || hasAutoLoadedRef.current) {
      return;
    }

    hasAutoLoadedRef.current = true;
    void fetchPlanner();
  }, [hasHomeLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SectionCard
      title="Tonight Planner"
      eyebrow="Observing Guide"
      description="A first-pass personalized planner that combines your observing coordinates, moon phase, ISS pass outlook, and the live mission board."
      className="md:col-span-2 xl:col-span-2"
      isLoading={isLoading}
      loadingLabel="Planning"
    >
      <div className="space-y-5">
        <form
          className="ui-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
          onSubmit={handleSubmit}
        >
          <div>
            <label className={labelClassName} htmlFor="plannerLatitude">
              Latitude
            </label>
            <input
              className={inputClassName}
              id="plannerLatitude"
              onChange={(event) => setLatitude(event.target.value)}
              value={latitude}
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="plannerLongitude">
              Longitude
            </label>
            <input
              className={inputClassName}
              id="plannerLongitude"
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
            {isLoading ? "Planning..." : "Build plan"}
          </button>
        </form>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="ui-panel ui-panel-feature p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ui-label">Primary Focus</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {result.locationName}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatCoordinate(result.latitude, "N", "S")} •{" "}
                    {formatCoordinate(result.longitude, "E", "W")}
                  </p>
                </div>
                <span className="ui-chip ui-chip-live">
                  {result.moonPhase} • {result.moonIlluminationPercent}% lit
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-white">
                {result.plannerSummary}
              </p>
              <p className="mt-3 text-sm leading-7 text-cyan-100/90">
                {result.recommendedFocus}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {result.highlights.map((highlight) => (
                <div className="ui-panel" key={highlight.label}>
                  <p className="ui-label">{highlight.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {highlight.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {result.windows.map((window) => (
                <div className="ui-panel p-4" key={window.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="ui-chip">{window.type.replace("-", " ")}</span>
                        {window.startsAt ? (
                          <span className="ui-chip">
                            {formatRelativeFuture(window.startsAt)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">{window.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {window.summary}
                      </p>
                    </div>
                    {window.startsAt ? (
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">
                        {formatDateTimeWithPreferences(
                          window.startsAt,
                          preferences.display,
                          homeTimeZone,
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="ui-panel border-dashed text-sm text-slate-300">
            Build a tonight plan to blend moon phase context, ISS pass timing, and
            the upcoming mission board around your observing location.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

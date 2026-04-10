"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { useHomeLocationFields } from "@/hooks/useHomeLocationFields";
import { DEFAULT_OBSERVER } from "@/lib/space-data";
import {
  formatAltitude,
  formatCoordinate,
  formatDateTimeWithPreferences,
} from "@/lib/formatters";
import { ApiRouteResponse, SatellitePositionApiResponse } from "@/lib/types";

const inputClassName =
  "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

type SatelliteSearchProps = {
  enabled: boolean;
  onTrackedSatelliteChange: (satellite: SatellitePositionApiResponse | null) => void;
  requestedFavoriteTrack?: {
    noradId: number;
    token: number;
  } | null;
};

export function SatelliteSearch({
  enabled,
  onTrackedSatelliteChange,
  requestedFavoriteTrack = null,
}: SatelliteSearchProps) {
  const { preferences, saveFavoriteObject } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const [noradId, setNoradId] = useState("25544");
  const {
    latitude: observerLat,
    longitude: observerLng,
    setLatitude: setObserverLat,
    setLongitude: setObserverLng,
    hasHomeLocation,
    applyHomeLocation,
  } = useHomeLocationFields({
    fallbackLatitude: DEFAULT_OBSERVER.latitude.toString(),
    fallbackLongitude: DEFAULT_OBSERVER.longitude.toString(),
  });
  const [result, setResult] = useState<SatellitePositionApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchSatellite(currentNoradId: string) {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: observerLat,
      lon: observerLng,
    });

    try {
      const response = await fetch(`/api/satellite/${currentNoradId}?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as ApiRouteResponse<SatellitePositionApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to fetch satellite data." : json.error.message,
        );
      }

      setResult(json.data);
      onTrackedSatelliteChange(json.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to fetch satellite data.",
      );
      onTrackedSatelliteChange(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchSatellite(noradId);
  }

  useEffect(() => {
    if (!requestedFavoriteTrack) {
      return;
    }

    setNoradId(requestedFavoriteTrack.noradId.toString());
    void fetchSatellite(requestedFavoriteTrack.noradId.toString());
  }, [requestedFavoriteTrack?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const latestPosition = result?.positions[0];

  return (
    <SectionCard
      title="Satellite Search"
      eyebrow="NORAD Lookup"
      description="Search any satellite by NORAD ID without sending your N2YO key to the browser. My Orbit can prefill your observer location."
      className="ui-card-feature"
      isLoading={isLoading}
      loadingLabel="Tracking"
    >
      {!enabled ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Add `N2YO_API_KEY` in `.env.local` to enable satellite search.
        </div>
      ) : (
        <div className="space-y-5">
          <form className="ui-panel grid gap-4 p-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <label className={labelClassName} htmlFor="noradId">
                NORAD ID
              </label>
              <input
                className={inputClassName}
                id="noradId"
                inputMode="numeric"
                onChange={(event) => setNoradId(event.target.value)}
                placeholder="25544"
                value={noradId}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="observerLat">
                  Observer Latitude
                </label>
                <input
                  className={inputClassName}
                  id="observerLat"
                  onChange={(event) => setObserverLat(event.target.value)}
                  value={observerLat}
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="observerLng">
                  Observer Longitude
                </label>
                <input
                  className={inputClassName}
                  id="observerLng"
                  onChange={(event) => setObserverLng(event.target.value)}
                  value={observerLng}
                />
              </div>
            </div>

            {hasHomeLocation ? (
              <button
                className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                onClick={applyHomeLocation}
                type="button"
              >
                Use My Orbit location
              </button>
            ) : null}

            <button
              className="ui-btn-primary w-full"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Searching orbit..." : "Search satellite"}
            </button>
          </form>

          {result ? (
            <div className="flex flex-wrap gap-3">
              <button
                className="ui-btn-secondary flex-1 rounded-[20px] py-3 text-sm"
                onClick={() => {
                  setResult(null);
                  setError(null);
                  onTrackedSatelliteChange(null);
                }}
                type="button"
              >
                Clear tracked satellite
              </button>
              <button
                className="ui-btn-secondary flex-1 rounded-[20px] py-3 text-sm"
                onClick={() => {
                  saveFavoriteObject({
                    id: `satellite-${result.info.satid}`,
                    type: "satellite",
                    label: result.info.satname,
                    subtitle: `NORAD ${result.info.satid}`,
                    noradId: result.info.satid,
                  });
                }}
                type="button"
              >
                Save to My Orbit
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {isLoading && result ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Pulling the latest orbital track...
            </p>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="ui-panel ui-panel-feature p-5">
                <p className="ui-label">
                  Satellite
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {result.info.satname}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  NORAD {result.info.satid} • {result.positions.length} position points
                </p>
              </div>

              {latestPosition ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ui-panel">
                    <p className="ui-label">
                      Latest Position
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {formatCoordinate(latestPosition.satlatitude, "N", "S")}
                    </p>
                    <p className="text-sm text-slate-100">
                      {formatCoordinate(latestPosition.satlongitude, "E", "W")}
                    </p>
                  </div>
                  <div className="ui-panel">
                    <p className="ui-label">
                      Altitude
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {formatAltitude(
                        latestPosition.sataltitude,
                        preferences.display.measurementSystem,
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatDateTimeWithPreferences(
                        latestPosition.timestamp,
                        preferences.display,
                        homeTimeZone,
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

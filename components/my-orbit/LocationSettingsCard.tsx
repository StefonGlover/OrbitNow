"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatCoordinate } from "@/lib/formatters";
import { ApiRouteResponse, OrbitLocationLookupApiResponse, OrbitLocationLookupResult } from "@/lib/types";

const inputClassName = "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

export function LocationSettingsCard() {
  const { preferences, hydrated, setHomeLocation } = useOrbitPreferences();
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedTimeZone, setSelectedTimeZone] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<OrbitLocationLookupResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!hydrated || seeded) {
      return;
    }

    if (preferences.homeLocation) {
      setLocationName(preferences.homeLocation.label);
      setLatitude(preferences.homeLocation.latitude.toString());
      setLongitude(preferences.homeLocation.longitude.toString());
      setSelectedTimeZone(preferences.homeLocation.timeZone);
    }

    setSeeded(true);
  }, [hydrated, preferences.homeLocation, seeded]);

  function clearFeedback() {
    setStatusMessage(null);
    setError(null);
  }

  function invalidateResolvedTimeZone() {
    setSelectedTimeZone(null);
  }

  async function handleLookup() {
    clearFeedback();
    setLookupResults([]);

    const trimmedQuery = locationName.trim();

    if (trimmedQuery.length < 2) {
      setError("Enter at least 2 characters to search for a location.");
      return;
    }

    setIsLookingUp(true);

    try {
      const params = new URLSearchParams({ q: trimmedQuery });
      const response = await fetch(`/api/location/search?${params.toString()}`, {
        cache: "no-store",
      });
      const json =
        (await response.json()) as ApiRouteResponse<OrbitLocationLookupApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "OrbitNow could not search locations." : json.error.message,
        );
      }

      setLookupResults(json.data.results);

      if (json.data.results.length === 0) {
        setStatusMessage("No matching locations were found. You can still save coordinates manually.");
      }
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "OrbitNow could not search locations right now.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const trimmedLabel = locationName.trim();
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (!trimmedLabel) {
      setError("Add a city or location name so OrbitNow can label your home base.");
      return;
    }

    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      setError("Latitude must be a number between -90 and 90.");
      return;
    }

    if (
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      setError("Longitude must be a number between -180 and 180.");
      return;
    }

    setHomeLocation({
      label: trimmedLabel,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      timeZone: selectedTimeZone,
    });
    setStatusMessage(
      selectedTimeZone
        ? `Home location saved with timezone ${selectedTimeZone}.`
        : "Home location saved. Run a place search to resolve the local timezone automatically.",
    );
  }

  function saveLookupResult(result: OrbitLocationLookupResult) {
    setLocationName(result.label);
    setLatitude(result.latitude.toString());
    setLongitude(result.longitude.toString());
    setSelectedTimeZone(result.timeZone);
    setHomeLocation({
      label: result.label,
      latitude: result.latitude,
      longitude: result.longitude,
      timeZone: result.timeZone,
    });
    setLookupResults([]);
    setError(null);
    setStatusMessage(
      result.timeZone
        ? `Home location saved and timezone resolved to ${result.timeZone}.`
        : "Home location saved from search results.",
    );
  }

  return (
    <SectionCard
      title="Location Settings"
      eyebrow="Home Base"
      description="Save a primary observing location for visible passes, AI sky briefs, personalized alerts, and home-time formatting."
      className="xl:col-span-3"
    >
      <div className="space-y-5">
        <form className="ui-panel grid gap-4 p-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelClassName} htmlFor="homeLocationName">
              City or Location Name
            </label>
            <input
              className={inputClassName}
              id="homeLocationName"
              onChange={(event) => {
                clearFeedback();
                invalidateResolvedTimeZone();
                setLocationName(event.target.value);
              }}
              placeholder="Cape Canaveral, FL"
              value={locationName}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="homeLatitude">
                Latitude
              </label>
              <input
                className={inputClassName}
                id="homeLatitude"
                inputMode="decimal"
                onChange={(event) => {
                  clearFeedback();
                  invalidateResolvedTimeZone();
                  setLatitude(event.target.value);
                }}
                placeholder="28.5729"
                value={latitude}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="homeLongitude">
                Longitude
              </label>
              <input
                className={inputClassName}
                id="homeLongitude"
                inputMode="decimal"
                onChange={(event) => {
                  clearFeedback();
                  invalidateResolvedTimeZone();
                  setLongitude(event.target.value);
                }}
                placeholder="-80.6490"
                value={longitude}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="ui-btn-primary" type="submit">
              Save home location
            </button>
            <button
              className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
              disabled={isLookingUp}
              onClick={() => {
                void handleLookup();
              }}
              type="button"
            >
              {isLookingUp ? "Searching..." : "Search places"}
            </button>
            {preferences.homeLocation ? (
              <button
                className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                onClick={() => {
                  setHomeLocation(null);
                  setLocationName("");
                  setLatitude("");
                  setLongitude("");
                  setSelectedTimeZone(null);
                  setLookupResults([]);
                  setError(null);
                  setStatusMessage("Home location cleared from this device.");
                }}
                type="button"
              >
                Clear location
              </button>
            ) : null}
          </div>
        </form>

        {statusMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {lookupResults.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="ui-label">Suggested Matches</p>
              <span className="ui-chip">{lookupResults.length} results</span>
            </div>
            <div className="grid gap-3">
              {lookupResults.map((result) => (
                <button
                  className="ui-choice-card text-left"
                  key={`${result.label}-${result.latitude}-${result.longitude}`}
                  onClick={() => saveLookupResult(result)}
                  type="button"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{result.label}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {formatCoordinate(result.latitude, "N", "S")} •{" "}
                        {formatCoordinate(result.longitude, "E", "W")}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {result.timeZone ? `Timezone: ${result.timeZone}` : "Timezone unavailable"}
                      </p>
                    </div>
                    <span className="ui-chip ui-chip-live">Use match</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {preferences.homeLocation ? (
          <div className="ui-panel ui-panel-feature p-5">
            <p className="ui-label">Saved Home Base</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {preferences.homeLocation.label}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {formatCoordinate(preferences.homeLocation.latitude, "N", "S")} •{" "}
              {formatCoordinate(preferences.homeLocation.longitude, "E", "W")}
            </p>
            <p className="mt-3 text-sm text-slate-200">
              {preferences.homeLocation.timeZone
                ? `Local timezone: ${preferences.homeLocation.timeZone}`
                : "Local timezone not resolved yet. Use Search places to attach one automatically."}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              OrbitNow will reuse this home base for visible passes, AI viewing guidance,
              personalized alerts, and home-based time presentation when enabled.
            </p>
          </div>
        ) : (
          <div className="ui-panel border-dashed text-sm text-slate-300">
            No home base is saved yet. Search for a place to auto-fill coordinates and timezone,
            or enter them manually if you already have exact values.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

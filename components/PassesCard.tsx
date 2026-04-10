"use client";

import { FormEvent, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { formatClockTime, formatDateTime } from "@/lib/formatters";
import { ApiRouteResponse, VisiblePassesApiResponse } from "@/lib/types";

const inputClassName =
  "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

type PassesCardProps = {
  enabled: boolean;
};

export function PassesCard({ enabled }: PassesCardProps) {
  const [latitude, setLatitude] = useState("40.7128");
  const [longitude, setLongitude] = useState("-74.0060");
  const [result, setResult] = useState<VisiblePassesApiResponse | null>(null);
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
      const response = await fetch(`/api/passes?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as ApiRouteResponse<VisiblePassesApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to fetch visible passes." : json.error.message,
        );
      }

      setResult(json.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to fetch visible passes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard
      title="Visible Passes"
      eyebrow="Observer View"
      description="Forecasted visual ISS passes for the coordinates you provide."
      className="md:col-span-2 xl:col-span-2"
      isLoading={isLoading}
      loadingLabel="Calculating"
    >
      {!enabled ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Add `N2YO_API_KEY` in `.env.local` to enable visual pass forecasts.
        </div>
      ) : (
        <div className="space-y-5">
          <form
            className="ui-panel grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={handleSubmit}
          >
            <div>
              <label className={labelClassName} htmlFor="passesLatitude">
                Latitude
              </label>
              <input
                className={inputClassName}
                id="passesLatitude"
                onChange={(event) => setLatitude(event.target.value)}
                value={latitude}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="passesLongitude">
                Longitude
              </label>
              <input
                className={inputClassName}
                id="passesLongitude"
                onChange={(event) => setLongitude(event.target.value)}
                value={longitude}
              />
            </div>
            <button
              className="ui-btn-primary mt-auto h-[52px]"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Calculating..." : "Find passes"}
            </button>
          </form>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {isLoading && result ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Updating visible pass forecast...
            </p>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="ui-panel ui-panel-feature p-5">
                <p className="ui-label">
                  Tracking
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {result.info.satname}
                </p>
                <p className="text-sm text-slate-300">
                  {result.passesCount} visible pass{result.passesCount === 1 ? "" : "es"} in the next{" "}
                  {result.days} days
                </p>
              </div>

              <div className="grid gap-3">
                {result.passes.length === 0 ? (
                  <div className="ui-panel text-sm text-slate-300">
                    No visible passes found for these coordinates in the selected window.
                  </div>
                ) : (
                  result.passes.slice(0, 3).map((pass, index) => (
                    <div
                      className="ui-panel p-4"
                      key={`${pass.startUTC}-${index}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">
                          Pass {index + 1} • {formatDateTime(pass.startUTC)}
                        </p>
                        <p className="text-sm text-cyan-200">
                          {Math.round(pass.duration)}s visible
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                        <p>Starts: {formatClockTime(pass.startUTC)}</p>
                        <p>Max: {formatClockTime(pass.maxUTC)}</p>
                        <p>Ends: {formatClockTime(pass.endUTC)}</p>
                        <p>Max elevation: {Math.round(pass.maxEl)}°</p>
                        <p>Brightness: {pass.mag.toFixed(1)} mag</p>
                        <p>Heading: {pass.maxAzCompass}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

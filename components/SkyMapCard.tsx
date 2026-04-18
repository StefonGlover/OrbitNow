"use client";

import { SectionCard } from "@/components/SectionCard";
import type { SatellitePositionApiResponse } from "@/lib/types";

const TRACK_COLORS = ["#22d3ee", "#8b5cf6", "#f97316", "#a3e635"];

function observersAlign(trackedSatellites: SatellitePositionApiResponse[]) {
  if (trackedSatellites.length <= 1) {
    return true;
  }

  const [firstSatellite] = trackedSatellites;

  return trackedSatellites.every((satellite) => {
    const latDiff = Math.abs(
      satellite.observer.latitude - firstSatellite.observer.latitude,
    );
    const lonDiff = Math.abs(
      satellite.observer.longitude - firstSatellite.observer.longitude,
    );

    return latDiff < 0.01 && lonDiff < 0.01;
  });
}

function toCompassLabel(azimuth: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round((((azimuth % 360) + 360) % 360) / 45) % directions.length;
  return directions[index];
}

function projectSkyPosition(azimuth: number, elevation: number) {
  const clampedElevation = Math.max(0, Math.min(90, elevation));
  const radius = 42 * (1 - clampedElevation / 90);
  const radians = (azimuth * Math.PI) / 180;

  return {
    x: 50 + radius * Math.sin(radians),
    y: 50 - radius * Math.cos(radians),
  };
}

type SkyMapCardProps = {
  trackedSatellites: SatellitePositionApiResponse[];
};

export function SkyMapCard({ trackedSatellites }: SkyMapCardProps) {
  const observerReady = observersAlign(trackedSatellites);
  const plottedSatellites = trackedSatellites
    .slice(0, 4)
    .map((satellite) => ({
      satellite,
      latestPosition: satellite.positions[0] ?? null,
    }))
    .filter(
      (
        item,
      ): item is {
        satellite: SatellitePositionApiResponse;
        latestPosition: SatellitePositionApiResponse["positions"][number];
      } => Boolean(item.latestPosition),
    );
  const observer = plottedSatellites[0]?.satellite.observer ?? null;

  return (
    <SectionCard
      title="Sky Map"
      eyebrow="Observer Layer"
      description="An observer-relative horizon plot for your tracked fleet. This is the foundation for a future AR pointing mode."
      className="md:col-span-2 xl:col-span-2"
    >
      {plottedSatellites.length === 0 ? (
        <div className="ui-panel border-dashed text-sm text-slate-300">
          Track one or more satellites to project their current azimuth and elevation
          against a sky map anchored to your observer position.
        </div>
      ) : !observerReady ? (
        <div className="ui-panel border-dashed text-sm text-slate-300">
          The current fleet was tracked from different observer coordinates. Refresh the
          satellites from one shared location to unlock the combined sky layer.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="ui-panel overflow-hidden p-4">
            <svg
              aria-label="Tracked satellite sky positions"
              className="h-[320px] w-full"
              viewBox="0 0 100 100"
            >
              <defs>
                <radialGradient id="skyMapGlow">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.16)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0)" />
                </radialGradient>
              </defs>
              <rect fill="url(#skyMapGlow)" height="100" rx="8" width="100" />
              <circle cx="50" cy="50" fill="none" r="42" stroke="rgba(255,255,255,0.14)" />
              <circle cx="50" cy="50" fill="none" r="28" stroke="rgba(255,255,255,0.1)" />
              <circle cx="50" cy="50" fill="none" r="14" stroke="rgba(255,255,255,0.08)" />
              <line
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 3"
                x1="8"
                x2="92"
                y1="50"
                y2="50"
              />
              <line
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 3"
                x1="50"
                x2="50"
                y1="8"
                y2="92"
              />

              <text fill="rgba(226,232,240,0.9)" fontSize="4" textAnchor="middle" x="50" y="8">
                N
              </text>
              <text fill="rgba(226,232,240,0.9)" fontSize="4" textAnchor="middle" x="92" y="52">
                E
              </text>
              <text fill="rgba(226,232,240,0.9)" fontSize="4" textAnchor="middle" x="50" y="96">
                S
              </text>
              <text fill="rgba(226,232,240,0.9)" fontSize="4" textAnchor="middle" x="8" y="52">
                W
              </text>

              {plottedSatellites.map(({ satellite, latestPosition }, index) => {
                const color = TRACK_COLORS[index % TRACK_COLORS.length];
                const projected = projectSkyPosition(
                  latestPosition.azimuth,
                  latestPosition.elevation,
                );

                return (
                  <g key={satellite.info.satid}>
                    <circle
                      cx={projected.x}
                      cy={projected.y}
                      fill={color}
                      fillOpacity={latestPosition.elevation > 0 ? 0.95 : 0.3}
                      r="2.6"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                    <text
                      fill="rgba(226,232,240,0.92)"
                      fontSize="3.2"
                      x={projected.x + 2.8}
                      y={projected.y - 2.2}
                    >
                      {satellite.info.satname}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {observer ? (
            <div className="ui-panel text-sm text-slate-300">
              Observer anchor: {observer.latitude.toFixed(2)}°, {observer.longitude.toFixed(2)}°
            </div>
          ) : null}

          <div className="space-y-3">
            {plottedSatellites.map(({ satellite, latestPosition }, index) => (
              <div className="ui-panel p-4" key={satellite.info.satid}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: TRACK_COLORS[index % TRACK_COLORS.length],
                        }}
                      />
                      <p className="text-sm font-semibold text-white">
                        {satellite.info.satname}
                      </p>
                      <span className="ui-chip">NORAD {satellite.info.satid}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {latestPosition.elevation > 0
                        ? "Above the horizon and ready for live pointing."
                        : "Currently below the horizon from this observer position."}
                    </p>
                  </div>
                  <div className="grid gap-2 text-right text-sm text-slate-200">
                    <p>
                      Azimuth: {Math.round(latestPosition.azimuth)}° {toCompassLabel(latestPosition.azimuth)}
                    </p>
                    <p>Elevation: {Math.round(latestPosition.elevation)}°</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

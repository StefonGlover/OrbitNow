"use client";

import { ReactNode, useEffect, useState } from "react";
import { FavoritesDockCard } from "@/components/FavoritesDockCard";
import { IssCard } from "@/components/IssCard";
import { LaunchesCard } from "@/components/LaunchesCard";
import { MissionDeckCard } from "@/components/MissionDeckCard";
import { PassesCard } from "@/components/PassesCard";
import { PeopleInSpaceCard } from "@/components/PeopleInSpaceCard";
import { SatelliteSearch } from "@/components/SatelliteSearch";
import { SkyMapCard } from "@/components/SkyMapCard";
import { SpaceMap } from "@/components/SpaceMap";
import { TonightPlannerCard } from "@/components/TonightPlannerCard";
import { WeatherVisibilityCard } from "@/components/WeatherVisibilityCard";
import { usePollingJson } from "@/hooks/usePollingJson";
import { formatRelativeFuture } from "@/lib/formatters";
import {
  IssApiResponse,
  LaunchesApiResponse,
  PeopleInSpaceApiResponse,
  SatellitePositionApiResponse,
} from "@/lib/types";

type OrbitNowDashboardProps = {
  satelliteFeaturesEnabled: boolean;
  viewingEnabled: boolean;
  initialIss?: IssApiResponse | null;
  initialAstronauts?: PeopleInSpaceApiResponse | null;
  initialLaunch?: LaunchesApiResponse | null;
  children?: ReactNode;
};

type DashboardHeroProps = {
  iss: IssApiResponse | null;
  astronauts: PeopleInSpaceApiResponse | null;
  launch: LaunchesApiResponse | null;
};

function DashboardHero({ iss, astronauts, launch }: DashboardHeroProps) {
  const issLatitude = iss ? `${iss.latitude.toFixed(2)} deg` : "Acquiring";
  const crewLabel = astronauts ? `${astronauts.totalPeople} aboard` : "Checking";
  const nextLaunchWindow = launch
    ? formatRelativeFuture(launch.launch.net)
    : "Standby";

  return (
    <header className="ui-card ui-card-constellation ui-card-hero">
      <div className="relative z-[1] flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="ui-orbit-mark ui-orbit-mark-lg">
            <span className="ui-live-dot h-2.5 w-2.5" />
          </div>
          <div>
            <p className="ui-kicker">Orbital Mission Console</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                OrbitNow
              </h1>
              <span className="ui-chip ui-chip-live">ISS live</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="ui-chip">Server-side routing</span>
          <span className="ui-chip">Ground track + search</span>
          <span className="ui-chip">AI + news intelligence</span>
        </div>
      </div>

      <div className="relative z-[1] mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-stretch">
        <div>
          <p className="ui-kicker">Mission Control</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl 2xl:text-6xl">
            Premium orbital awareness for the live sky above Earth.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            Follow the ISS with a dark world map, compare other spacecraft by
            NORAD ID, and keep launch, crew, skywatch guidance, AI-generated
            insight, and the latest space news in one polished mission-control
            view.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="ui-chip ui-chip-live">
              <span className="ui-live-dot" />
              5-second ISS updates
            </span>
            <span className="ui-chip">Orbital ground track</span>
            <span className="ui-chip">Launch watch</span>
          </div>
        </div>

        <div className="ui-hero-orbit">
          <span className="ui-hero-satellite" />
          <div className="relative z-[2] flex h-full min-h-[280px] flex-col justify-between gap-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-chip ui-chip-live">
                <span className="ui-live-dot" />
                Live ISS console
              </span>
              <span className="ui-chip">LEO watch</span>
            </div>

            <div className="max-w-sm">
              <p className="ui-kicker">Orbital Layer</p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Earth, crew, missions, and sky windows in one command view.
              </p>
            </div>

            <div className="ui-telemetry-grid">
              <div className="ui-telemetry-tile">
                <p className="ui-label">ISS Latitude</p>
                <p className="mt-2 text-lg font-semibold text-white">{issLatitude}</p>
              </div>
              <div className="ui-telemetry-tile">
                <p className="ui-label">Crew</p>
                <p className="mt-2 text-lg font-semibold text-white">{crewLabel}</p>
              </div>
              <div className="ui-telemetry-tile">
                <p className="ui-label">Next Launch</p>
                <p className="mt-2 truncate text-lg font-semibold text-white">
                  {nextLaunchWindow}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function OrbitNowDashboard({
  satelliteFeaturesEnabled,
  viewingEnabled,
  initialIss = null,
  initialAstronauts = null,
  initialLaunch = null,
  children,
}: OrbitNowDashboardProps) {
  const issState = usePollingJson<IssApiResponse>("/api/iss", 5_000, {
    initialData: initialIss,
  });
  const issBusy = issState.isLoading || issState.isRefreshing;
  const [issTrail, setIssTrail] = useState<Array<[number, number]>>(
    initialIss ? [[initialIss.latitude, initialIss.longitude]] : [],
  );
  const [trackedSatellites, setTrackedSatellites] = useState<
    SatellitePositionApiResponse[]
  >([]);
  const [favoriteTrackRequest, setFavoriteTrackRequest] = useState<{
    noradId: number;
    token: number;
  } | null>(null);

  function trackSatellite(satellite: SatellitePositionApiResponse | null) {
    if (!satellite) {
      return;
    }

    setTrackedSatellites((currentSatellites) =>
      [
        satellite,
        ...currentSatellites.filter(
          (currentSatellite) =>
            currentSatellite.info.satid !== satellite.info.satid,
        ),
      ].slice(0, 4),
    );
  }

  function removeTrackedSatellite(noradId: number) {
    setTrackedSatellites((currentSatellites) =>
      currentSatellites.filter((satellite) => satellite.info.satid !== noradId),
    );
  }

  useEffect(() => {
    if (!issState.data) {
      return;
    }

    const nextPoint: [number, number] = [
      issState.data.latitude,
      issState.data.longitude,
    ];

    setIssTrail((current) => {
      const previousPoint = current[current.length - 1];

      if (
        previousPoint &&
        previousPoint[0] === nextPoint[0] &&
        previousPoint[1] === nextPoint[1]
      ) {
        return current;
      }

      return [...current.slice(-23), nextPoint];
    });
  }, [issState.data]);

  return (
    <div className="space-y-7 lg:space-y-8">
      <DashboardHero
        astronauts={initialAstronauts}
        iss={issState.data}
        launch={initialLaunch}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.82fr)]">
        <SpaceMap
          error={issState.error}
          isLoading={issBusy}
          iss={issState.data}
          issTrail={issTrail}
          trackedSatellites={trackedSatellites}
        />
        <div className="grid gap-6 self-start md:grid-cols-2 xl:grid-cols-1">
          <IssCard
            data={issState.data}
            error={issState.error}
            isLoading={issBusy}
            onRefresh={issState.refresh}
          />
          <SatelliteSearch
            enabled={satelliteFeaturesEnabled}
            onClearTrackedSatellites={() => setTrackedSatellites([])}
            onRemoveTrackedSatellite={removeTrackedSatellite}
            onTrackedSatelliteChange={trackSatellite}
            requestedFavoriteTrack={favoriteTrackRequest}
            trackedSatellites={trackedSatellites}
          />
          <FavoritesDockCard
            onTrackFavorite={(noradId) =>
              setFavoriteTrackRequest({
                noradId,
                token: Date.now(),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
        {children}
        <MissionDeckCard />
        <PeopleInSpaceCard initialData={initialAstronauts} />
        <LaunchesCard initialData={initialLaunch} />
        <PassesCard enabled={satelliteFeaturesEnabled} />
        <WeatherVisibilityCard enabled={viewingEnabled} />
        <TonightPlannerCard />
        <SkyMapCard trackedSatellites={trackedSatellites} />
      </div>
    </div>
  );
}

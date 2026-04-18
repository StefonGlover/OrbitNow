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

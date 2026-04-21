import { cache } from "react";
import {
  createApodFallback,
  createLaunchFallback,
  createPeopleInSpaceFallback,
  fetchAstronomyPictureOfTheDay,
  fetchIssLocation,
  fetchNextLaunch,
  fetchPeopleInSpace,
} from "@/lib/space-data";
import {
  ApodApiResponse,
  IssApiResponse,
  LaunchesApiResponse,
  PeopleInSpaceApiResponse,
} from "@/lib/types";

export type AiDashboardContext = {
  iss: IssApiResponse;
  astronauts: PeopleInSpaceApiResponse;
  launch: LaunchesApiResponse;
  apod: ApodApiResponse;
};

export function createIssFallback(): IssApiResponse {
  return {
    source: "Open Notify",
    timestamp: Math.floor(Date.now() / 1000),
    latitude: 0,
    longitude: 0,
  };
}

export const fetchAiDashboardContext = cache(async (): Promise<AiDashboardContext> => {
  // All AI cards share the same dashboard snapshot so we only ever reason over
  // server-fetched data and never expose third-party secrets to the browser.
  const [iss, astronauts, launch, apod] = await Promise.all([
    fetchIssLocation().catch(() => createIssFallback()),
    fetchPeopleInSpace().catch(() => createPeopleInSpaceFallback()),
    fetchNextLaunch().catch(() => createLaunchFallback()),
    fetchAstronomyPictureOfTheDay().catch(() => createApodFallback()),
  ]);

  return {
    iss,
    astronauts,
    launch,
    apod,
  };
});

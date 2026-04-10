import type { OrbitPreferences } from "@/lib/orbit-preferences";

export interface ApiErrorResponse {
  error: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

export interface ApiMeta {
  fetchedAt: string;
  cachedForSeconds?: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailureResponse {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
}

export type ApiRouteResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export interface OrbitSessionUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface OrbitAuthSessionResponse {
  authenticated: boolean;
  user: OrbitSessionUser | null;
}

export interface OrbitAuthResponse extends OrbitAuthSessionResponse {
  preferences: OrbitPreferences | null;
  syncedAt: string | null;
}

export interface OrbitPreferencesSyncResponse {
  preferences: OrbitPreferences;
  syncedAt: string;
}

export interface OrbitLocationLookupResult {
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string | null;
  country: string | null;
  region: string | null;
}

export interface OrbitLocationLookupApiResponse {
  query: string;
  results: OrbitLocationLookupResult[];
}

export interface OrbitNotificationAlert {
  id: string;
  key: string;
  type: "iss-pass" | "launch" | "news";
  title: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
}

export interface OrbitAlertsPollApiResponse {
  alerts: OrbitNotificationAlert[];
  polledAt: string;
}

export interface OpenNotifyIssResponse {
  message: "success" | "failure";
  timestamp: number;
  iss_position: {
    latitude: string;
    longitude: string;
  };
}

export interface OpenNotifyPeopleResponse {
  message: "success" | "failure";
  number: number;
  people: Array<{
    name: string;
    craft: string;
  }>;
}

export interface IssApiResponse {
  source: "Open Notify";
  timestamp: number;
  latitude: number;
  longitude: number;
}

export interface PeopleInSpaceApiResponse {
  source: "Open Notify";
  totalPeople: number;
  people: Array<{
    name: string;
    craft: string;
  }>;
}

export interface SpaceflightNewsAuthor {
  name: string;
  socials: string | null;
}

export interface SpaceflightNewsArticle {
  id: number;
  title: string;
  authors: SpaceflightNewsAuthor[];
  url: string;
  image_url: string | null;
  news_site: string;
  summary: string;
  published_at: string;
  updated_at: string;
  featured: boolean;
}

export interface SpaceflightNewsArticlesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SpaceflightNewsArticle[];
}

export interface N2YoSatelliteInfo {
  satname: string;
  satid: number;
  transactionscount: number;
}

export interface N2YoPosition {
  satlatitude: number;
  satlongitude: number;
  sataltitude: number;
  azimuth: number;
  elevation: number;
  ra: number;
  dec: number;
  timestamp: number;
  eclipsed: boolean;
}

export interface N2YoPositionsResponse {
  info: N2YoSatelliteInfo;
  positions: N2YoPosition[];
}

export interface SatellitePositionApiResponse {
  observer: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };
  durationSeconds: number;
  info: N2YoSatelliteInfo;
  positions: N2YoPosition[];
}

export interface N2YoVisualPass {
  startAz: number;
  startAzCompass: string;
  startEl: number;
  startUTC: number;
  maxAz: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAz: number;
  endAzCompass: string;
  endEl: number;
  endUTC: number;
  mag: number;
  duration: number;
}

export interface N2YoVisualPassesResponse {
  info: N2YoSatelliteInfo;
  passescount: number;
  passes: N2YoVisualPass[];
}

export interface VisiblePassesApiResponse {
  observer: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };
  days: number;
  minimumVisibilitySeconds: number;
  info: N2YoSatelliteInfo;
  passesCount: number;
  passes: N2YoVisualPass[];
}

export interface LaunchLibraryStatus {
  id: number;
  name: string;
  abbrev: string | null;
  description: string;
}

export interface LaunchLibraryProvider {
  id: number;
  name: string;
  type: string;
}

export interface LaunchLibraryMission {
  id: number;
  name: string;
  description: string | null;
  type: string;
  orbit?: {
    name: string;
    abbrev: string;
  } | null;
}

export interface LaunchLibraryPad {
  id: number;
  name: string;
  location?: {
    name: string;
  } | null;
}

export interface LaunchLibraryRocketConfiguration {
  id: number;
  full_name: string;
}

export interface LaunchLibraryUpcomingItem {
  id: string;
  name: string;
  net: string;
  window_start: string | null;
  image: string | null;
  status: LaunchLibraryStatus;
  launch_service_provider: LaunchLibraryProvider;
  mission: LaunchLibraryMission | null;
  pad: LaunchLibraryPad | null;
  rocket?: {
    configuration?: LaunchLibraryRocketConfiguration | null;
  } | null;
}

export interface LaunchLibraryUpcomingResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LaunchLibraryUpcomingItem[];
}

export interface LaunchesApiResponse {
  source: "Launch Library 2";
  launch: {
    id: string;
    name: string;
    net: string;
    windowStart: string | null;
    status: string;
    provider: string;
    rocket: string | null;
    missionName: string | null;
    missionDescription: string | null;
    orbit: string | null;
    padName: string | null;
    locationName: string | null;
    image: string | null;
  };
}

export interface NasaApodResponse {
  copyright?: string;
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: "image" | "video" | string;
  service_version: string;
  title: string;
  url: string;
}

export interface ApodApiResponse {
  source: "NASA APOD";
  item: {
    date: string;
    title: string;
    explanation: string;
    mediaType: string;
    imageUrl: string;
    hdImageUrl: string | null;
    copyright: string | null;
  };
}

export interface SpaceNewsStory {
  id: number;
  title: string;
  summary: string;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
  updatedAt: string;
  authorNames: string[];
}

export interface LatestSpaceNewsFeedResponse {
  source: "Spaceflight News API";
  fetchedAt: string;
  totalResults: number;
  featuredStory: SpaceNewsStory | null;
  articles: SpaceNewsStory[];
}

export interface SpaceNewsIntelligenceSignal {
  label: string;
  value: string;
}

export interface SpaceNewsIntelligence {
  source: "OpenAI";
  model: string;
  generatedAt: string;
  featuredStoryId: number | null;
  title: string;
  summary: string;
  whyNow: string;
  watchList: string[];
  signals: SpaceNewsIntelligenceSignal[];
}

export interface LatestSpaceNewsApiResponse extends LatestSpaceNewsFeedResponse {
  intelligence: SpaceNewsIntelligence;
}

export interface MissionBriefDataPoint {
  label: string;
  value: string;
}

export interface MissionBriefApiResponse {
  source: "OpenAI";
  model: string;
  generatedAt: string;
  briefing: {
    title: string;
    summary: string;
    highlights: string[];
    watchNow: string;
    nextSteps: string[];
    dataPoints: MissionBriefDataPoint[];
  };
}

export interface CuriosityInsightItem {
  title: string;
  insight: string;
  whyItMatters: string;
}

export interface CuriosityInsightsApiResponse {
  source: "OpenAI";
  model: string;
  generatedAt: string;
  insights: CuriosityInsightItem[];
}

export interface WhatIfInsightApiResponse {
  source: "OpenAI";
  model: string;
  generatedAt: string;
  prompt: string;
  response: {
    title: string;
    answer: string;
    assumptions: string[];
    relatedFact: string;
  };
}

export interface OpenAIResponsesApiResponse {
  id: string;
  output_text?: string;
  output?: Array<{
    type: string;
    role?: string;
    content?: Array<
      | {
          type: "output_text";
          text: string;
        }
      | {
          type: "refusal";
          refusal: string;
        }
    >;
  }>;
}

export interface ViewingConditionsFactor {
  label: string;
  value: string;
}

export interface ViewingConditionsApiResponse {
  source: "OpenAI";
  model: string;
  generatedAt: string;
  locationName: string;
  latitude: number;
  longitude: number;
  skySummary: string;
  viewingOutlook: string;
  recommendedAction: string;
  confidenceNote: string;
  factors: ViewingConditionsFactor[];
}

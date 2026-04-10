import {
  ApodApiResponse,
  IssApiResponse,
  LaunchesApiResponse,
  LaunchLibraryUpcomingResponse,
  LatestSpaceNewsApiResponse,
  N2YoPositionsResponse,
  N2YoVisualPassesResponse,
  NasaApodResponse,
  OpenNotifyIssResponse,
  OpenNotifyPeopleResponse,
  PeopleInSpaceApiResponse,
  SatellitePositionApiResponse,
  SpaceflightNewsArticle,
  SpaceflightNewsArticlesResponse,
  VisiblePassesApiResponse,
} from "@/lib/types";
import { withServerCache } from "@/lib/server/cache";
import { serverConfigError, upstreamError } from "@/lib/server/api";

const OPEN_NOTIFY_BASE_URL = "http://api.open-notify.org";
const N2YO_BASE_URL = "https://api.n2yo.com/rest/v1/satellite";
const LAUNCH_LIBRARY_BASE_URL = "https://lldev.thespacedevs.com/2.0.0";
const NASA_BASE_URL = "https://api.nasa.gov/planetary";
const SPACEFLIGHT_NEWS_BASE_URL = "https://api.spaceflightnewsapi.net/v4";

export const DEFAULT_OBSERVER = {
  latitude: 28.5728722,
  longitude: -80.6489808,
  altitudeKm: 0,
};

type FetchJsonOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, init?: FetchJsonOptions): Promise<T> {
  const {
    timeoutMs = 10_000,
    retries = 0,
    retryDelayMs = 800,
    retryOnStatuses = [429, 500, 502, 503, 504],
    ...requestInit
  } = init ?? {};

  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...requestInit,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...requestInit.headers,
        },
      });

      if (!response.ok) {
        const details = await response.text();

        if (attempt < retries && retryOnStatuses.includes(response.status)) {
          attempt += 1;
          await delay(retryDelayMs * attempt);
          continue;
        }

        const friendlyMessage =
          response.status === 429
            ? "The upstream provider is rate-limiting requests right now."
            : `Upstream request failed with ${response.status}.`;
        throw upstreamError(
          friendlyMessage,
          details
            ? {
                status: response.status,
                details: details.slice(0, 160),
              }
            : { status: response.status },
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < retries) {
          attempt += 1;
          await delay(retryDelayMs * attempt);
          continue;
        }

        throw upstreamError("The upstream request timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function requireServerEnv(
  name: "N2YO_API_KEY" | "NASA_API_KEY",
): string {
  const value = process.env[name];

  if (!value) {
    throw serverConfigError(`${name} is not configured on the server.`);
  }

  return value;
}

function normalizeRemoteAssetUrl(value: string | null) {
  if (!value) {
    return null;
  }

  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
}

function normalizeArticleSummary(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || "No summary available for this article yet.";
}

function normalizeSpaceNewsArticle(article: SpaceflightNewsArticle) {
  return {
    id: article.id,
    title: article.title.trim(),
    summary: normalizeArticleSummary(article.summary),
    url: article.url,
    imageUrl: normalizeRemoteAssetUrl(article.image_url),
    source: article.news_site.trim(),
    publishedAt: article.published_at,
    updatedAt: article.updated_at,
    authorNames: article.authors
      .map((author) => author.name.trim())
      .filter(Boolean),
  };
}

export async function fetchIssLocation(): Promise<IssApiResponse> {
  return withServerCache("iss-location", {
    ttlMs: 5_000,
    staleWhileErrorMs: 20_000,
    loader: async () => {
      const response = await fetchJson<OpenNotifyIssResponse>(
        `${OPEN_NOTIFY_BASE_URL}/iss-now.json`,
      );

      if (response.message !== "success") {
        throw new Error("Open Notify did not return a successful ISS response.");
      }

      return {
        source: "Open Notify",
        timestamp: response.timestamp,
        latitude: Number(response.iss_position.latitude),
        longitude: Number(response.iss_position.longitude),
      };
    },
  });
}

export async function fetchPeopleInSpace(): Promise<PeopleInSpaceApiResponse> {
  return withServerCache("people-in-space", {
    ttlMs: 60_000,
    staleWhileErrorMs: 300_000,
    loader: async () => {
      const response = await fetchJson<OpenNotifyPeopleResponse>(
        `${OPEN_NOTIFY_BASE_URL}/astros.json`,
      );

      if (response.message !== "success") {
        throw new Error("Open Notify did not return a successful astronaut response.");
      }

      return {
        source: "Open Notify",
        totalPeople: response.number,
        people: response.people,
      };
    },
  });
}

export function createPeopleInSpaceFallback(): PeopleInSpaceApiResponse {
  return {
    source: "Open Notify",
    totalPeople: 0,
    people: [],
  };
}

export async function fetchSatellitePositions(input: {
  noradId: number;
  observerLat?: number;
  observerLng?: number;
  observerAltKm?: number;
  seconds?: number;
}): Promise<SatellitePositionApiResponse> {
  const observerLat = input.observerLat ?? DEFAULT_OBSERVER.latitude;
  const observerLng = input.observerLng ?? DEFAULT_OBSERVER.longitude;
  const observerAltKm = input.observerAltKm ?? DEFAULT_OBSERVER.altitudeKm;
  const seconds = input.seconds ?? 120;
  const apiKey = requireServerEnv("N2YO_API_KEY");

  const response = await fetchJson<N2YoPositionsResponse>(
    `${N2YO_BASE_URL}/positions/${input.noradId}/${observerLat}/${observerLng}/${observerAltKm}/${seconds}/&apiKey=${apiKey}`,
  );

  return {
    observer: {
      latitude: observerLat,
      longitude: observerLng,
      altitudeKm: observerAltKm,
    },
    durationSeconds: seconds,
    info: response.info,
    positions: response.positions,
  };
}

export async function fetchVisiblePasses(input: {
  noradId?: number;
  observerLat: number;
  observerLng: number;
  observerAltKm?: number;
  days?: number;
  minimumVisibilitySeconds?: number;
}): Promise<VisiblePassesApiResponse> {
  const noradId = input.noradId ?? 25544;
  const observerAltKm = input.observerAltKm ?? DEFAULT_OBSERVER.altitudeKm;
  const days = input.days ?? 7;
  const minimumVisibilitySeconds = input.minimumVisibilitySeconds ?? 300;
  const apiKey = requireServerEnv("N2YO_API_KEY");

  const response = await fetchJson<N2YoVisualPassesResponse>(
    `${N2YO_BASE_URL}/visualpasses/${noradId}/${input.observerLat}/${input.observerLng}/${observerAltKm}/${days}/${minimumVisibilitySeconds}/&apiKey=${apiKey}`,
  );

  return {
    observer: {
      latitude: input.observerLat,
      longitude: input.observerLng,
      altitudeKm: observerAltKm,
    },
    days,
    minimumVisibilitySeconds,
    info: response.info,
    passesCount: response.passescount,
    passes: response.passes,
  };
}

export async function fetchNextLaunch(): Promise<LaunchesApiResponse> {
  return withServerCache("next-launch", {
    ttlMs: 300_000,
    staleWhileErrorMs: 3_600_000,
    loader: async () => {
      const params = new URLSearchParams({
        limit: "1",
        ordering: "net",
        mode: "detailed",
      });

      const response = await fetchJson<LaunchLibraryUpcomingResponse>(
        `${LAUNCH_LIBRARY_BASE_URL}/launch/upcoming/?${params.toString()}`,
        {
          timeoutMs: 15_000,
          retries: 1,
        },
      );

      const nextLaunch = response.results[0];

      if (!nextLaunch) {
        throw new Error("No upcoming launches were returned.");
      }

      return {
        source: "Launch Library 2",
        launch: {
          id: nextLaunch.id,
          name: nextLaunch.name,
          net: nextLaunch.net,
          windowStart: nextLaunch.window_start,
          status: nextLaunch.status.name,
          provider: nextLaunch.launch_service_provider.name,
          rocket: nextLaunch.rocket?.configuration?.full_name ?? null,
          missionName: nextLaunch.mission?.name ?? null,
          missionDescription: nextLaunch.mission?.description ?? null,
          orbit: nextLaunch.mission?.orbit?.name ?? null,
          padName: nextLaunch.pad?.name ?? null,
          locationName: nextLaunch.pad?.location?.name ?? null,
          image: nextLaunch.image,
        },
      };
    },
  });
}

export function createLaunchFallback(): LaunchesApiResponse {
  return {
    source: "Launch Library 2",
    launch: {
      id: "fallback-launch",
      name: "Launch data temporarily unavailable",
      net: new Date().toISOString(),
      windowStart: null,
      status: "Unavailable",
      provider: "Unknown provider",
      rocket: null,
      missionName: null,
      missionDescription:
        "The launch provider is taking longer than usual to respond. Try refreshing again shortly.",
      orbit: null,
      padName: null,
      locationName: null,
      image: null,
    },
  };
}

export async function fetchLatestSpaceNews(): Promise<LatestSpaceNewsApiResponse> {
  return withServerCache("latest-space-news", {
    ttlMs: 600_000,
    staleWhileErrorMs: 3_600_000,
    loader: async () => {
      const params = new URLSearchParams({
        limit: "5",
        ordering: "-published_at",
      });

      // News is fetched on the server and normalized here so the client only
      // ever sees one stable OrbitNow-friendly JSON shape.
      const response = await fetchJson<SpaceflightNewsArticlesResponse>(
        `${SPACEFLIGHT_NEWS_BASE_URL}/articles/?${params.toString()}`,
        {
          timeoutMs: 12_000,
          retries: 1,
          retryDelayMs: 1_000,
        },
      );

      const normalizedArticles = response.results.map(normalizeSpaceNewsArticle);
      const [featuredStory = null, ...articles] = normalizedArticles;

      return {
        source: "Spaceflight News API",
        fetchedAt: new Date().toISOString(),
        totalResults: response.count,
        featuredStory,
        articles,
      };
    },
  });
}

export async function fetchAstronomyPictureOfTheDay(): Promise<ApodApiResponse> {
  return withServerCache("apod", {
    ttlMs: 86_400_000,
    staleWhileErrorMs: 86_400_000,
    loader: async () => {
      const apiKey = requireServerEnv("NASA_API_KEY");
      const params = new URLSearchParams({
        api_key: apiKey,
      });

      const response = await fetchJson<NasaApodResponse>(
        `${NASA_BASE_URL}/apod?${params.toString()}`,
        {
          timeoutMs: 20_000,
          retries: 1,
          retryDelayMs: 1_200,
        },
      );

      return {
        source: "NASA APOD",
        item: {
          date: response.date,
          title: response.title,
          explanation: response.explanation,
          mediaType: response.media_type,
          imageUrl: response.url,
          hdImageUrl: response.hdurl ?? null,
          copyright: response.copyright ?? null,
        },
      };
    },
  });
}

export function createApodFallback(): ApodApiResponse {
  return {
    source: "NASA APOD",
    item: {
      date: new Date().toISOString().slice(0, 10),
      title: "Daily Feature Temporarily Unavailable",
      explanation:
        "NASA's Astronomy Picture of the Day is taking longer than usual to respond. You can refresh again shortly or open the official APOD site directly.",
      mediaType: "text",
      imageUrl: "https://apod.nasa.gov/apod/astropix.html",
      hdImageUrl: null,
      copyright: null,
    },
  };
}

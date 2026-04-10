import { badRequest, upstreamError } from "@/lib/server/api";
import type {
  OrbitLocationLookupApiResponse,
  OrbitLocationLookupResult,
} from "@/lib/types";

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function lookupLocations(query: string): Promise<OrbitLocationLookupApiResponse> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    throw badRequest("Enter at least 2 characters to search for a location.");
  }

  const params = new URLSearchParams({
    name: trimmedQuery,
    count: "5",
    language: "en",
    format: "json",
  });

  const response = await fetch(`${OPEN_METEO_GEOCODING_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw upstreamError("Location lookup failed.", {
      status: response.status,
    });
  }

  const json = (await response.json()) as OpenMeteoGeocodingResponse;
  const results: OrbitLocationLookupResult[] = (json.results ?? []).map((result) => {
    const regionParts = [result.admin1, result.country].filter(Boolean);

    return {
      label: regionParts.length > 0 ? `${result.name}, ${regionParts.join(", ")}` : result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      timeZone: result.timezone ?? null,
      country: result.country ?? null,
      region: result.admin1 ?? null,
    };
  });

  return {
    query: trimmedQuery,
    results,
  };
}

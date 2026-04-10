export type LightingCondition = "Night" | "Twilight" | "Daylight";

export type ViewingBriefInputs = {
  locationName: string;
  latitude: number;
  longitude: number;
  utcNow: string;
  approximateLocalSolarTime: string;
  approximateLighting: LightingCondition;
  hemisphere: "Northern" | "Southern" | "Equatorial";
  season: "Winter" | "Spring" | "Summer" | "Autumn";
};

function formatHour(value: number) {
  const normalized = ((value % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const minutes = Math.round((normalized - hours) * 60) % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function getHemisphere(latitude: number): ViewingBriefInputs["hemisphere"] {
  if (latitude > 15) {
    return "Northern";
  }

  if (latitude < -15) {
    return "Southern";
  }

  return "Equatorial";
}

function getSeason(
  monthIndex: number,
  hemisphere: ViewingBriefInputs["hemisphere"],
): ViewingBriefInputs["season"] {
  const northernSeason =
    monthIndex <= 1 || monthIndex === 11
      ? "Winter"
      : monthIndex <= 4
        ? "Spring"
        : monthIndex <= 7
          ? "Summer"
          : "Autumn";

  if (hemisphere === "Equatorial") {
    return northernSeason;
  }

  if (hemisphere === "Northern") {
    return northernSeason;
  }

  const southernMap: Record<ViewingBriefInputs["season"], ViewingBriefInputs["season"]> = {
    Winter: "Summer",
    Spring: "Autumn",
    Summer: "Winter",
    Autumn: "Spring",
  };

  return southernMap[northernSeason];
}

function getApproximateLighting(hour: number): LightingCondition {
  if (hour >= 20 || hour < 5) {
    return "Night";
  }

  if ((hour >= 5 && hour < 7) || (hour >= 18 && hour < 20)) {
    return "Twilight";
  }

  return "Daylight";
}

export function buildViewingBriefInputs(
  latitude: number,
  longitude: number,
): ViewingBriefInputs {
  const now = new Date();
  const utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const approximateLocalSolarHour = utcHours + longitude / 15;
  const hemisphere = getHemisphere(latitude);

  return {
    locationName: `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? "N" : "S"} • ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? "E" : "W"}`,
    latitude,
    longitude,
    utcNow: now.toISOString(),
    approximateLocalSolarTime: formatHour(approximateLocalSolarHour),
    approximateLighting: getApproximateLighting(approximateLocalSolarHour),
    hemisphere,
    season: getSeason(now.getUTCMonth(), hemisphere),
  };
}

export const ORBIT_PREFERENCES_STORAGE_KEY = "orbitnow.preferences.v1";

export const ORBIT_NEWS_TOPICS = [
  {
    value: "iss",
    label: "ISS",
    description: "Station operations, crew activity, and orbit updates.",
  },
  {
    value: "launches",
    label: "Launches",
    description: "Upcoming missions, scrubs, and launch outcomes.",
  },
  {
    value: "satellites",
    label: "Satellites",
    description: "Commercial constellations, defense payloads, and tracking news.",
  },
  {
    value: "moon-missions",
    label: "Moon Missions",
    description: "Artemis, landers, and lunar infrastructure.",
  },
  {
    value: "mars",
    label: "Mars",
    description: "Rovers, science campaigns, and future Mars architectures.",
  },
  {
    value: "astronomy-discoveries",
    label: "Astronomy Discoveries",
    description: "Telescopes, deep-space observations, and major findings.",
  },
  {
    value: "space-weather",
    label: "Space Weather",
    description: "Solar activity, aurora alerts, and environmental conditions in space.",
  },
] as const;

export type OrbitNewsTopic = (typeof ORBIT_NEWS_TOPICS)[number]["value"];

export type OrbitFavoriteObjectType = "satellite" | "mission" | "launch";
export type OrbitThemeMode = "midnight" | "nebula";
export type OrbitMeasurementSystem = "metric" | "imperial";
export type OrbitTimeFormat = "12h" | "24h";
export type OrbitTimeZoneMode = "browser" | "utc" | "home";

export interface OrbitHomeLocation {
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string | null;
}

export interface OrbitFavoriteObject {
  id: string;
  type: OrbitFavoriteObjectType;
  label: string;
  subtitle: string;
  savedAt: string;
  noradId?: number | null;
}

export interface OrbitFavoriteObjectInput {
  id: string;
  type: OrbitFavoriteObjectType;
  label: string;
  subtitle: string;
  noradId?: number | null;
}

export interface OrbitAlertPreferences {
  issOverheadSoon: boolean;
  launchReminders: boolean;
  majorNewsAlerts: boolean;
}

export interface OrbitDisplayPreferences {
  themeMode: OrbitThemeMode;
  measurementSystem: OrbitMeasurementSystem;
  timeFormat: OrbitTimeFormat;
  timeZoneMode: OrbitTimeZoneMode;
}

export interface OrbitPreferences {
  version: 1;
  updatedAt: string;
  homeLocation: OrbitHomeLocation | null;
  favoriteObjects: OrbitFavoriteObject[];
  newsTopics: OrbitNewsTopic[];
  alerts: OrbitAlertPreferences;
  display: OrbitDisplayPreferences;
}

function normalizeFavoriteType(value: unknown): OrbitFavoriteObjectType {
  if (value === "launch" || value === "mission") {
    return value;
  }

  return "satellite";
}

export function createDefaultOrbitPreferences(): OrbitPreferences {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    homeLocation: null,
    favoriteObjects: [],
    newsTopics: ["iss", "launches", "astronomy-discoveries"],
    alerts: {
      issOverheadSoon: false,
      launchReminders: true,
      majorNewsAlerts: true,
    },
    display: {
      themeMode: "midnight",
      measurementSystem: "metric",
      timeFormat: "12h",
      timeZoneMode: "browser",
    },
  };
}

function normalizeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function areOrbitPreferencesEquivalent(
  left: OrbitPreferences,
  right: OrbitPreferences,
) {
  return JSON.stringify({
    ...left,
    updatedAt: "",
  }) === JSON.stringify({
    ...right,
    updatedAt: "",
  });
}

export function hasMeaningfulOrbitPreferences(preferences: OrbitPreferences) {
  const defaults = createDefaultOrbitPreferences();

  if (preferences.homeLocation) {
    return true;
  }

  if (preferences.favoriteObjects.length > 0) {
    return true;
  }

  if (preferences.newsTopics.join("|") !== defaults.newsTopics.join("|")) {
    return true;
  }

  if (
    preferences.alerts.issOverheadSoon !== defaults.alerts.issOverheadSoon ||
    preferences.alerts.launchReminders !== defaults.alerts.launchReminders ||
    preferences.alerts.majorNewsAlerts !== defaults.alerts.majorNewsAlerts
  ) {
    return true;
  }

  return (
    preferences.display.themeMode !== defaults.display.themeMode ||
    preferences.display.measurementSystem !== defaults.display.measurementSystem ||
    preferences.display.timeFormat !== defaults.display.timeFormat ||
    preferences.display.timeZoneMode !== defaults.display.timeZoneMode
  );
}

export function mergeOrbitPreferences(
  localPreferences: OrbitPreferences,
  remotePreferences: OrbitPreferences,
) {
  const localMeaningful = hasMeaningfulOrbitPreferences(localPreferences);
  const remoteMeaningful = hasMeaningfulOrbitPreferences(remotePreferences);

  if (localMeaningful && !remoteMeaningful) {
    return localPreferences;
  }

  if (remoteMeaningful && !localMeaningful) {
    return remotePreferences;
  }

  return normalizeTimestamp(localPreferences.updatedAt) >=
    normalizeTimestamp(remotePreferences.updatedAt)
    ? localPreferences
    : remotePreferences;
}

export function isOrbitNewsTopic(value: string): value is OrbitNewsTopic {
  return ORBIT_NEWS_TOPICS.some((topic) => topic.value === value);
}

export function normalizeOrbitNewsTopics(values: string[]): OrbitNewsTopic[] {
  const uniqueValues = Array.from(new Set(values.filter(isOrbitNewsTopic)));

  return ORBIT_NEWS_TOPICS
    .map((topic) => topic.value)
    .filter((topic) => uniqueValues.includes(topic));
}

export function normalizeOrbitPreferences(value: unknown): OrbitPreferences {
  const defaults = createDefaultOrbitPreferences();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const input = value as Partial<OrbitPreferences>;
  const homeLocation =
    input.homeLocation &&
    typeof input.homeLocation.label === "string" &&
    typeof input.homeLocation.latitude === "number" &&
    Number.isFinite(input.homeLocation.latitude) &&
    typeof input.homeLocation.longitude === "number" &&
    Number.isFinite(input.homeLocation.longitude)
      ? {
          label: input.homeLocation.label.trim(),
          latitude: input.homeLocation.latitude,
          longitude: input.homeLocation.longitude,
          timeZone:
            typeof input.homeLocation.timeZone === "string" &&
            input.homeLocation.timeZone
              ? input.homeLocation.timeZone
              : null,
        }
      : null;

  const favoriteObjects = Array.isArray(input.favoriteObjects)
    ? input.favoriteObjects
        .filter(
          (favorite): favorite is OrbitFavoriteObject =>
            Boolean(
              favorite &&
                typeof favorite.id === "string" &&
                typeof favorite.label === "string" &&
                typeof favorite.subtitle === "string" &&
                typeof favorite.type === "string",
            ),
        )
        .map((favorite) => ({
          id: favorite.id,
          label: favorite.label.trim(),
          subtitle: favorite.subtitle.trim(),
          type: normalizeFavoriteType(favorite.type),
          savedAt:
            typeof favorite.savedAt === "string" && favorite.savedAt
              ? favorite.savedAt
              : defaults.updatedAt,
          noradId:
            typeof favorite.noradId === "number" && Number.isFinite(favorite.noradId)
              ? favorite.noradId
              : null,
        }))
    : defaults.favoriteObjects;

  return {
    version: 1,
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt
        ? input.updatedAt
        : defaults.updatedAt,
    homeLocation,
    favoriteObjects,
    newsTopics: Array.isArray(input.newsTopics)
      ? normalizeOrbitNewsTopics(input.newsTopics)
      : defaults.newsTopics,
    alerts: {
      issOverheadSoon: Boolean(input.alerts?.issOverheadSoon),
      launchReminders:
        input.alerts?.launchReminders ?? defaults.alerts.launchReminders,
      majorNewsAlerts:
        input.alerts?.majorNewsAlerts ?? defaults.alerts.majorNewsAlerts,
    },
    display: {
      themeMode:
        input.display?.themeMode === "nebula" ? "nebula" : defaults.display.themeMode,
      measurementSystem:
        input.display?.measurementSystem === "imperial"
          ? "imperial"
          : defaults.display.measurementSystem,
      timeFormat:
        input.display?.timeFormat === "24h" ? "24h" : defaults.display.timeFormat,
      timeZoneMode:
        input.display?.timeZoneMode === "utc"
          ? "utc"
          : input.display?.timeZoneMode === "home"
            ? "home"
            : defaults.display.timeZoneMode,
    },
  };
}

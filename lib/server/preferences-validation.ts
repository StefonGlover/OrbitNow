import {
  ORBIT_NEWS_TOPICS,
  type OrbitFavoriteObject,
  type OrbitFavoriteObjectType,
  type OrbitMeasurementSystem,
  type OrbitNewsTopic,
  type OrbitPreferences,
  type OrbitThemeMode,
  type OrbitTimeFormat,
  type OrbitTimeZoneMode,
} from "@/lib/orbit-preferences";
import { badRequest } from "@/lib/server/api";

const validFavoriteTypes = new Set<OrbitFavoriteObjectType>([
  "satellite",
  "mission",
  "launch",
]);
const validNewsTopics = new Set<string>(ORBIT_NEWS_TOPICS.map((topic) => topic.value));

function assertObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function assertString(
  value: unknown,
  label: string,
  options?: {
    minLength?: number;
    maxLength?: number;
  },
) {
  if (typeof value !== "string") {
    throw badRequest(`${label} must be a string.`);
  }

  const normalized = value.trim();

  if (options?.minLength !== undefined && normalized.length < options.minLength) {
    throw badRequest(`${label} must be at least ${options.minLength} characters.`);
  }

  if (options?.maxLength !== undefined && normalized.length > options.maxLength) {
    throw badRequest(`${label} must be at most ${options.maxLength} characters.`);
  }

  return normalized;
}

function assertBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw badRequest(`${label} must be true or false.`);
  }

  return value;
}

function assertFiniteNumber(
  value: unknown,
  label: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  },
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw badRequest(`${label} must be a valid number.`);
  }

  if (options?.integer && !Number.isInteger(value)) {
    throw badRequest(`${label} must be a whole number.`);
  }

  if (options?.min !== undefined && value < options.min) {
    throw badRequest(`${label} must be at least ${options.min}.`);
  }

  if (options?.max !== undefined && value > options.max) {
    throw badRequest(`${label} must be at most ${options.max}.`);
  }

  return value;
}

function assertIsoTimestamp(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw badRequest(`${label} must be a valid timestamp.`);
  }

  return value;
}

function parseFavoriteObject(value: unknown, index: number): OrbitFavoriteObject {
  const favorite = assertObject(value, `preferences.favoriteObjects[${index}]`);
  const favoriteType = favorite.type;

  if (typeof favoriteType !== "string" || !validFavoriteTypes.has(favoriteType as OrbitFavoriteObjectType)) {
    throw badRequest(
      `preferences.favoriteObjects[${index}].type must be satellite, mission, or launch.`,
    );
  }

  const noradId =
    favorite.noradId === null || favorite.noradId === undefined
      ? null
      : assertFiniteNumber(
          favorite.noradId,
          `preferences.favoriteObjects[${index}].noradId`,
          {
            integer: true,
            min: 1,
          },
        );

  return {
    id: assertString(favorite.id, `preferences.favoriteObjects[${index}].id`, {
      minLength: 1,
      maxLength: 120,
    }),
    type: favoriteType as OrbitFavoriteObjectType,
    label: assertString(
      favorite.label,
      `preferences.favoriteObjects[${index}].label`,
      {
        minLength: 1,
        maxLength: 120,
      },
    ),
    subtitle: assertString(
      favorite.subtitle,
      `preferences.favoriteObjects[${index}].subtitle`,
      {
        minLength: 1,
        maxLength: 160,
      },
    ),
    savedAt: assertIsoTimestamp(
      favorite.savedAt,
      `preferences.favoriteObjects[${index}].savedAt`,
    ),
    noradId,
  };
}

export function validateOrbitPreferencesInput(value: unknown): OrbitPreferences {
  const preferences = assertObject(value, "preferences");
  const homeLocationValue = preferences.homeLocation;
  const favoriteObjectsValue = preferences.favoriteObjects;
  const newsTopicsValue = preferences.newsTopics;
  const alertsValue = preferences.alerts;
  const displayValue = preferences.display;

  const homeLocation =
    homeLocationValue === null
      ? null
      : (() => {
          const homeLocationObject = assertObject(
            homeLocationValue,
            "preferences.homeLocation",
          );

          return {
            label: assertString(homeLocationObject.label, "preferences.homeLocation.label", {
              minLength: 1,
              maxLength: 120,
            }),
            latitude: assertFiniteNumber(
              homeLocationObject.latitude,
              "preferences.homeLocation.latitude",
              {
                min: -90,
                max: 90,
              },
            ),
            longitude: assertFiniteNumber(
              homeLocationObject.longitude,
              "preferences.homeLocation.longitude",
              {
                min: -180,
                max: 180,
              },
            ),
            timeZone:
              homeLocationObject.timeZone === null
                ? null
                : assertString(
                    homeLocationObject.timeZone,
                    "preferences.homeLocation.timeZone",
                    {
                      minLength: 1,
                      maxLength: 120,
                    },
                  ),
          };
        })();

  if (!Array.isArray(favoriteObjectsValue)) {
    throw badRequest("preferences.favoriteObjects must be an array.");
  }

  if (favoriteObjectsValue.length > 10) {
    throw badRequest("preferences.favoriteObjects can contain at most 10 items.");
  }

  if (!Array.isArray(newsTopicsValue)) {
    throw badRequest("preferences.newsTopics must be an array.");
  }

  const normalizedNewsTopics = newsTopicsValue.map((topic, index) => {
    const value = assertString(topic, `preferences.newsTopics[${index}]`, {
      minLength: 1,
      maxLength: 40,
    });

    if (!validNewsTopics.has(value)) {
      throw badRequest(`preferences.newsTopics[${index}] is not a supported topic.`);
    }

    return value as OrbitNewsTopic;
  });

  const alerts = assertObject(alertsValue, "preferences.alerts");
  const display = assertObject(displayValue, "preferences.display");

  if (
    display.themeMode !== "midnight" &&
    display.themeMode !== "nebula"
  ) {
    throw badRequest("preferences.display.themeMode must be midnight or nebula.");
  }

  if (
    display.measurementSystem !== "metric" &&
    display.measurementSystem !== "imperial"
  ) {
    throw badRequest(
      "preferences.display.measurementSystem must be metric or imperial.",
    );
  }

  if (display.timeFormat !== "12h" && display.timeFormat !== "24h") {
    throw badRequest("preferences.display.timeFormat must be 12h or 24h.");
  }

  if (
    display.timeZoneMode !== "browser" &&
    display.timeZoneMode !== "utc" &&
    display.timeZoneMode !== "home"
  ) {
    throw badRequest(
      "preferences.display.timeZoneMode must be browser, utc, or home.",
    );
  }

  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    homeLocation,
    favoriteObjects: favoriteObjectsValue.map((favorite, index) =>
      parseFavoriteObject(favorite, index),
    ),
    newsTopics: normalizedNewsTopics,
    alerts: {
      issOverheadSoon: assertBoolean(
        alerts.issOverheadSoon,
        "preferences.alerts.issOverheadSoon",
      ),
      launchReminders: assertBoolean(
        alerts.launchReminders,
        "preferences.alerts.launchReminders",
      ),
      majorNewsAlerts: assertBoolean(
        alerts.majorNewsAlerts,
        "preferences.alerts.majorNewsAlerts",
      ),
      nightlyPlannerDigest: assertBoolean(
        alerts.nightlyPlannerDigest,
        "preferences.alerts.nightlyPlannerDigest",
      ),
      quietHoursEnabled: assertBoolean(
        alerts.quietHoursEnabled,
        "preferences.alerts.quietHoursEnabled",
      ),
      quietHoursStartHour: assertFiniteNumber(
        alerts.quietHoursStartHour,
        "preferences.alerts.quietHoursStartHour",
        {
          integer: true,
          min: 0,
          max: 23,
        },
      ),
      quietHoursEndHour: assertFiniteNumber(
        alerts.quietHoursEndHour,
        "preferences.alerts.quietHoursEndHour",
        {
          integer: true,
          min: 0,
          max: 23,
        },
      ),
      launchReminderLeadHours: assertFiniteNumber(
        alerts.launchReminderLeadHours,
        "preferences.alerts.launchReminderLeadHours",
        {
          integer: true,
          min: 1,
          max: 72,
        },
      ),
    },
    display: {
      themeMode: display.themeMode as OrbitThemeMode,
      measurementSystem: display.measurementSystem as OrbitMeasurementSystem,
      timeFormat: display.timeFormat as OrbitTimeFormat,
      timeZoneMode: display.timeZoneMode as OrbitTimeZoneMode,
    },
  };
}

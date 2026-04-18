import { buildObservingPlan } from "@/lib/observing-plan";
import { fetchLatestSpaceNews } from "@/lib/news";
import { fetchNextLaunch, fetchVisiblePasses } from "@/lib/space-data";
import type { OrbitPreferences } from "@/lib/orbit-preferences";
import type { OrbitAlertsPollApiResponse, OrbitNotificationAlert } from "@/lib/types";

function toAlert(input: Omit<OrbitNotificationAlert, "id" | "createdAt">): OrbitNotificationAlert {
  return {
    ...input,
    id: `${input.key}:${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

function getHourInTimeZone(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date),
  );
}

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function isQuietHoursActive(preferences: OrbitPreferences, date: Date) {
  if (!preferences.alerts.quietHoursEnabled) {
    return false;
  }

  const timeZone = preferences.homeLocation?.timeZone ?? "UTC";
  const hour = getHourInTimeZone(date, timeZone);
  const startHour = preferences.alerts.quietHoursStartHour;
  const endHour = preferences.alerts.quietHoursEndHour;

  if (startHour === endHour) {
    return true;
  }

  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}

export async function buildAlertsForPreferences(input: {
  userId: string;
  preferences: OrbitPreferences;
  deliveredByKey: Record<string, string>;
}): Promise<OrbitAlertsPollApiResponse> {
  const alerts: OrbitNotificationAlert[] = [];
  const { preferences, deliveredByKey } = input;
  const now = new Date();

  if (isQuietHoursActive(preferences, now)) {
    return {
      alerts,
      polledAt: now.toISOString(),
    };
  }

  if (
    preferences.alerts.issOverheadSoon &&
    preferences.homeLocation &&
    process.env.N2YO_API_KEY
  ) {
    const passes = await fetchVisiblePasses({
      observerLat: preferences.homeLocation.latitude,
      observerLng: preferences.homeLocation.longitude,
      days: 1,
      minimumVisibilitySeconds: 120,
    }).catch(() => null);

    const nextPass = passes?.passes.find((pass) => pass.startUTC * 1000 > Date.now());

    if (nextPass) {
      const key = `iss-pass:${nextPass.startUTC}`;

      if (!deliveredByKey[key] && nextPass.startUTC * 1000 - Date.now() <= 1000 * 60 * 60 * 6) {
        alerts.push(
          toAlert({
            key,
            type: "iss-pass",
            title: "ISS overhead soon",
            body: `A visible ISS pass is approaching for ${preferences.homeLocation.label}. Max elevation ${Math.round(nextPass.maxEl)} degrees.`,
            actionUrl: "/",
          }),
        );
      }
    }
  }

  if (preferences.alerts.launchReminders) {
    const launch = await fetchNextLaunch().catch(() => null);

    if (launch?.launch?.id) {
      const launchTime = new Date(launch.launch.net).getTime();
      const msUntilLaunch = launchTime - Date.now();
      const leadHours = preferences.alerts.launchReminderLeadHours;
      const key = `launch:${launch.launch.id}:${leadHours}h`;

      if (
        !deliveredByKey[key] &&
        msUntilLaunch > 0 &&
        msUntilLaunch <= 1000 * 60 * 60 * leadHours
      ) {
        alerts.push(
          toAlert({
            key,
            type: "launch",
            title: "Launch reminder",
            body: `${launch.launch.name} is now inside your ${leadHours}-hour launch reminder window.`,
            actionUrl: `/missions/${launch.launch.id}`,
          }),
        );
      }
    }
  }

  if (preferences.alerts.nightlyPlannerDigest && preferences.homeLocation) {
    const timeZone = preferences.homeLocation.timeZone ?? "UTC";
    const localHour = getHourInTimeZone(now, timeZone);
    const key = `planner:${getDateKeyInTimeZone(now, timeZone)}`;

    if (!deliveredByKey[key] && localHour >= 18 && localHour <= 22) {
      const planner = await buildObservingPlan({
        latitude: preferences.homeLocation.latitude,
        longitude: preferences.homeLocation.longitude,
        locationName: preferences.homeLocation.label,
      }).catch(() => null);

      if (planner) {
        alerts.push(
          toAlert({
            key,
            type: "planner",
            title: "Tonight's observing planner is ready",
            body: planner.recommendedFocus,
            actionUrl: "/",
          }),
        );
      }
    }
  }

  if (preferences.alerts.majorNewsAlerts) {
    const news = await fetchLatestSpaceNews({
      preferredTopics: preferences.newsTopics,
    }).catch(() => null);

    if (news?.featuredStory) {
      const key = `news:${news.featuredStory.id}`;

      if (!deliveredByKey[key]) {
        alerts.push(
          toAlert({
            key,
            type: "news",
            title: "Major space news update",
            body: news.intelligence.title,
            actionUrl: news.featuredStory.url,
          }),
        );
      }
    }
  }

  return {
    alerts,
    polledAt: now.toISOString(),
  };
}

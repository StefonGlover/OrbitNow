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

export async function buildAlertsForPreferences(input: {
  userId: string;
  preferences: OrbitPreferences;
  deliveredByKey: Record<string, string>;
}): Promise<OrbitAlertsPollApiResponse> {
  const alerts: OrbitNotificationAlert[] = [];
  const { preferences, deliveredByKey } = input;

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
      const key = `launch:${launch.launch.id}:24h`;

      if (!deliveredByKey[key] && msUntilLaunch > 0 && msUntilLaunch <= 1000 * 60 * 60 * 24) {
        alerts.push(
          toAlert({
            key,
            type: "launch",
            title: "Launch reminder",
            body: `${launch.launch.name} is inside the next 24 hours.`,
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
    polledAt: new Date().toISOString(),
  };
}

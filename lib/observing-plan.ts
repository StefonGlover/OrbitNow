import { fetchUpcomingLaunches, fetchVisiblePasses } from "@/lib/space-data";
import type { ObservingPlanApiResponse } from "@/lib/types";

const SYNODIC_MONTH_DAYS = 29.53058867;
const KNOWN_NEW_MOON_UTC_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

function normalizeMoonAgeDays(date: Date) {
  const moonAgeDays =
    ((date.getTime() - KNOWN_NEW_MOON_UTC_MS) / 86_400_000) % SYNODIC_MONTH_DAYS;

  return moonAgeDays >= 0 ? moonAgeDays : moonAgeDays + SYNODIC_MONTH_DAYS;
}

function getMoonPhaseDetails(date: Date) {
  const ageDays = normalizeMoonAgeDays(date);
  const illuminationPercent = Math.round(
    ((1 - Math.cos((ageDays / SYNODIC_MONTH_DAYS) * Math.PI * 2)) / 2) * 100,
  );

  if (ageDays < 1.84566) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "New Moon",
    };
  }

  if (ageDays < 5.53699) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "Waxing Crescent",
    };
  }

  if (ageDays < 9.22831) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "First Quarter",
    };
  }

  if (ageDays < 12.91963) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "Waxing Gibbous",
    };
  }

  if (ageDays < 16.61096) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "Full Moon",
    };
  }

  if (ageDays < 20.30228) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "Waning Gibbous",
    };
  }

  if (ageDays < 23.99361) {
    return {
      ageDays,
      illuminationPercent,
      phaseLabel: "Last Quarter",
    };
  }

  return {
    ageDays,
    illuminationPercent,
    phaseLabel: "Waning Crescent",
  };
}

function buildPlannerSummary(input: {
  moonIlluminationPercent: number;
  hasIssPass: boolean;
  hasLaunch: boolean;
}) {
  if (input.hasIssPass && input.moonIlluminationPercent <= 40) {
    return "Darker moonlight and an upcoming ISS pass make tonight a strong session for orbital watching plus brighter deep-sky targets.";
  }

  if (input.hasIssPass) {
    return "Tonight is strongest for time-boxed orbital viewing, with the next ISS pass acting as the anchor event.";
  }

  if (input.hasLaunch) {
    return "Tonight leans more toward mission-following than live skywatching, with the next launch window as the main event.";
  }

  if (input.moonIlluminationPercent >= 75) {
    return "A bright moon favors lunar detail and brighter targets over faint deep-sky observing tonight.";
  }

  return "Tonight is a good low-pressure session for checking the moon phase, revisiting favorites, and watching for the next orbital event.";
}

function buildRecommendedFocus(input: {
  locationName: string;
  moonIlluminationPercent: number;
  nextIssPassTitle: string | null;
  nextLaunchTitle: string | null;
}) {
  if (input.nextIssPassTitle) {
    return `Plan your session around ${input.nextIssPassTitle} for ${input.locationName}, then use the remaining window for brighter follow-up targets.`;
  }

  if (input.moonIlluminationPercent >= 75) {
    return "Favor lunar viewing, brighter planets, and wide-field scans until a stronger pass or launch event comes into view.";
  }

  if (input.nextLaunchTitle) {
    return `Keep ${input.nextLaunchTitle} on deck and use the gap beforehand for a short sky scan from your observing spot.`;
  }

  return "Use this as a lightweight planning night: verify your location, refresh your tracked satellites, and build tomorrow's observing queue.";
}

export async function buildObservingPlan(input: {
  latitude: number;
  longitude: number;
  locationName?: string | null;
}): Promise<ObservingPlanApiResponse> {
  const moon = getMoonPhaseDetails(new Date());
  const locationName =
    input.locationName?.trim() ||
    `${input.latitude.toFixed(2)}°, ${input.longitude.toFixed(2)}°`;

  const passes =
    process.env.N2YO_API_KEY
      ? await fetchVisiblePasses({
          observerLat: input.latitude,
          observerLng: input.longitude,
          days: 1,
          minimumVisibilitySeconds: 120,
        }).catch(() => null)
      : null;
  const nextLaunchFeed = await fetchUpcomingLaunches(3).catch(() => null);

  const nextIssPass =
    passes?.passes.find((pass) => pass.startUTC * 1000 > Date.now()) ?? null;
  const nextLaunch = nextLaunchFeed?.launches[0] ?? null;

  const nextIssPassTitle = nextIssPass
    ? `an ISS pass at ${new Date(nextIssPass.startUTC * 1000).toISOString()}`
    : null;
  const nextLaunchTitle = nextLaunch?.name ?? null;

  const windows: ObservingPlanApiResponse["windows"] = [
    {
      id: "moon-phase",
      type: "moon-phase",
      title: moon.phaseLabel,
      startsAt: null,
      summary:
        moon.illuminationPercent >= 75
          ? "Expect bright moonlight. Favor lunar detail and brighter targets."
          : moon.illuminationPercent <= 35
            ? "Darker conditions improve contrast for fainter observing targets."
            : "Moderate moonlight keeps the night flexible for mixed observing.",
    },
  ];

  if (nextIssPass) {
    windows.push({
      id: `iss-pass-${nextIssPass.startUTC}`,
      type: "iss-pass",
      title: "Next visible ISS pass",
      startsAt: new Date(nextIssPass.startUTC * 1000).toISOString(),
      summary: `Visible for about ${Math.round(nextIssPass.duration)} seconds with a max elevation of ${Math.round(nextIssPass.maxEl)} degrees.`,
    });
  }

  if (nextLaunch) {
    windows.push({
      id: `launch-${nextLaunch.id}`,
      type: "launch-window",
      title: nextLaunch.name,
      startsAt: nextLaunch.net,
      summary: nextLaunch.missionDescription
        ? nextLaunch.missionDescription
        : `${nextLaunch.provider} is targeting the next published launch window.`,
    });
  }

  return {
    source: "OrbitNow Planner",
    generatedAt: new Date().toISOString(),
    locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    moonPhase: moon.phaseLabel,
    moonIlluminationPercent: moon.illuminationPercent,
    plannerSummary: buildPlannerSummary({
      moonIlluminationPercent: moon.illuminationPercent,
      hasIssPass: Boolean(nextIssPass),
      hasLaunch: Boolean(nextLaunch),
    }),
    recommendedFocus: buildRecommendedFocus({
      locationName,
      moonIlluminationPercent: moon.illuminationPercent,
      nextIssPassTitle,
      nextLaunchTitle,
    }),
    highlights: [
      {
        label: "Moonlight",
        value: `${moon.phaseLabel} • ${moon.illuminationPercent}% illuminated`,
      },
      {
        label: "ISS outlook",
        value: nextIssPass
          ? `${Math.round(nextIssPass.maxEl)}° max elevation in the next 24 hours`
          : "No visible ISS pass surfaced in the next 24 hours",
      },
      {
        label: "Launch watch",
        value: nextLaunch
          ? `${nextLaunch.name} is the next major mission on deck`
          : "No near-term launch signal was available",
      },
    ],
    windows,
  };
}

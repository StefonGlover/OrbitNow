import { Suspense } from "react";
import { ApodCardFallback } from "@/components/ApodCardFallback";
import { CuriosityInsightsCardFallback } from "@/components/CuriosityInsightsCardFallback";
import { LatestSpaceNewsCardFallback } from "@/components/LatestSpaceNewsCardFallback";
import { MissionBriefCardFallback } from "@/components/MissionBriefCardFallback";
import { WhatIfInsightCard } from "@/components/WhatIfInsightCard";
import {
  createLaunchFallback,
  createPeopleInSpaceFallback,
  fetchIssLocation,
  fetchNextLaunch,
  fetchPeopleInSpace,
} from "@/lib/space-data";
import { OrbitNowDashboard } from "@/components/OrbitNowDashboard";
import { StreamedApodCard } from "@/components/server/StreamedApodCard";
import { StreamedCuriosityInsightsCard } from "@/components/server/StreamedCuriosityInsightsCard";
import { StreamedLatestSpaceNewsCard } from "@/components/server/StreamedLatestSpaceNewsCard";
import { StreamedMissionBriefCard } from "@/components/server/StreamedMissionBriefCard";

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export default async function Home() {
  const [initialIss, initialAstronauts, initialLaunch] = await Promise.all([
    withTimeout(fetchIssLocation().catch(() => null), null, 1_500),
    withTimeout(
      fetchPeopleInSpace().catch(() => createPeopleInSpaceFallback()),
      createPeopleInSpaceFallback(),
      1_500,
    ),
    withTimeout(
      fetchNextLaunch().catch(() => createLaunchFallback()),
      createLaunchFallback(),
      2_000,
    ),
  ]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <OrbitNowDashboard
          satelliteFeaturesEnabled={Boolean(process.env.N2YO_API_KEY)}
          viewingEnabled={Boolean(process.env.OPENAI_API_KEY)}
          initialAstronauts={initialAstronauts}
          initialIss={initialIss}
          initialLaunch={initialLaunch}
        >
          <Suspense fallback={<MissionBriefCardFallback />}>
            <StreamedMissionBriefCard />
          </Suspense>
          <Suspense fallback={<CuriosityInsightsCardFallback />}>
            <StreamedCuriosityInsightsCard />
          </Suspense>
          <WhatIfInsightCard />
        </OrbitNowDashboard>

        <div className="mt-7 grid gap-6 md:grid-cols-2 xl:mt-8 xl:grid-cols-6">
          <Suspense fallback={<LatestSpaceNewsCardFallback />}>
            <StreamedLatestSpaceNewsCard />
          </Suspense>
          <Suspense fallback={<ApodCardFallback />}>
            <StreamedApodCard />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

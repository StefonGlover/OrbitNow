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
        <header className="ui-card ui-card-hero mb-8 lg:mb-10">
          <div className="relative z-[1] flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/14 via-sky-400/10 to-indigo-500/10">
                <span className="absolute inset-[9px] rounded-[18px] border border-white/10" />
                <span className="ui-live-dot h-2.5 w-2.5" />
              </div>
              <div>
                <p className="ui-kicker">Orbital Mission Console</p>
                <div className="mt-1 flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                    OrbitNow
                  </h1>
                  <span className="ui-chip ui-chip-live">ISS live</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-chip">Server-side routing</span>
              <span className="ui-chip">Ground track + search</span>
              <span className="ui-chip">AI + news intelligence</span>
            </div>
          </div>

          <div className="relative z-[1] mt-8 grid gap-8 xl:grid-cols-[1.18fr_0.82fr] xl:items-end">
            <div>
              <p className="ui-kicker">Mission Control</p>
              <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                Premium orbital awareness for the live sky above Earth.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                Follow the ISS with a dark world map, compare other spacecraft by
                NORAD ID, and keep launch, crew, skywatch guidance, AI-generated
                insight, and the latest space news in one polished mission-control
                view.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="ui-chip ui-chip-live">
                  <span className="ui-live-dot" />
                  5-second ISS updates
                </span>
                <span className="ui-chip">Dark map hero</span>
                <span className="ui-chip">Responsive control deck</span>
              </div>
            </div>

            <div className="ui-panel ui-panel-feature grid gap-4 p-5 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div>
                <p className="ui-label">Live Poll</p>
                <p className="mt-3 text-base font-medium text-white">ISS every 5 seconds</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Continuous client polling through local API routes keeps the browser
                  responsive and secrets server-side.
                </p>
              </div>
              <div>
                <p className="ui-label">Map Surface</p>
                <p className="mt-3 text-base font-medium text-white">ISS glow + orbit trail</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Live station position, recent path history, and optional satellite
                  search overlays share one visual map layer.
                </p>
              </div>
              <div>
                <p className="ui-label">AI Layer</p>
                <p className="mt-3 text-base font-medium text-white">Curiosity and what-if insight</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Mission summaries and scenario-driven insights translate raw orbital
                  data into quick, readable context.
                </p>
              </div>
            </div>
          </div>
        </header>

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

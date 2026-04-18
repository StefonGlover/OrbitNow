import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchMissionDetail } from "@/lib/space-data";

type MissionDetailPageProps = {
  params: {
    launchId: string;
  };
};

export default async function MissionDetailPage({
  params,
}: MissionDetailPageProps) {
  const mission = await fetchMissionDetail(params.launchId).catch(() => null);

  if (!mission) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="ui-card ui-card-hero">
          <div className="relative z-[1] flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="ui-kicker">Mission Detail</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                {mission.mission.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                {mission.statusSummary}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="ui-chip ui-chip-live">{mission.mission.status}</span>
              {mission.mission.missionType ? (
                <span className="ui-chip">{mission.mission.missionType}</span>
              ) : null}
              {mission.mission.orbit ? <span className="ui-chip">{mission.mission.orbit}</span> : null}
              <Link className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm" href="/">
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="relative z-[1] mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="ui-panel ui-panel-feature p-5">
              <p className="ui-label">NET</p>
              <p className="mt-3 text-lg font-semibold text-white">{mission.mission.net}</p>
            </div>
            <div className="ui-panel p-5">
              <p className="ui-label">Provider</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {mission.mission.provider}
              </p>
            </div>
            <div className="ui-panel p-5">
              <p className="ui-label">Rocket</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {mission.mission.rocket ?? "Not published"}
              </p>
            </div>
            <div className="ui-panel p-5">
              <p className="ui-label">Pad / Site</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {mission.mission.padName ?? mission.mission.locationName ?? "Pending"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-6">
          <section className="ui-card xl:col-span-4">
            <div className="space-y-4">
              <div>
                <p className="ui-kicker">Mission Readout</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  What to watch
                </h2>
              </div>

              <div className="ui-panel ui-panel-feature p-5">
                <p className="ui-label">Launch Window</p>
                <p className="mt-3 text-sm leading-7 text-white">
                  {mission.launchWindowLabel}
                </p>
              </div>

              {mission.mission.missionDescription ? (
                <div className="ui-panel p-5 text-sm leading-7 text-slate-300">
                  {mission.mission.missionDescription}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {mission.objectives.map((objective) => (
                  <div className="ui-panel p-4" key={objective}>
                    <p className="ui-label">Objective</p>
                    <p className="mt-3 text-sm leading-7 text-white">{objective}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ui-card xl:col-span-2">
            <div className="space-y-4">
              <div>
                <p className="ui-kicker">Timeline</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Key moments
                </h2>
              </div>
              {mission.timeline.map((entry) => (
                <div className="ui-panel p-4" key={entry.label}>
                  <p className="ui-label">{entry.label}</p>
                  {entry.time ? (
                    <p className="mt-3 text-sm font-semibold text-white">{entry.time}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {entry.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="ui-card xl:col-span-3">
            <div className="space-y-4">
              <div>
                <p className="ui-kicker">Mission Targets</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Related signals
                </h2>
              </div>
              {mission.relatedTargets.length > 0 ? (
                mission.relatedTargets.map((target) => (
                  <div className="ui-panel p-4" key={target}>
                    <p className="text-sm font-medium text-white">{target}</p>
                  </div>
                ))
              ) : (
                <div className="ui-panel border-dashed text-sm text-slate-300">
                  More mission targets should populate here as richer timeline data and
                  mission metadata are added.
                </div>
              )}
            </div>
          </section>

          <section className="ui-card xl:col-span-3">
            <div className="space-y-4">
              <div>
                <p className="ui-kicker">Mission Context</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Current launch context
                </h2>
              </div>
              <div className="ui-panel p-5">
                <p className="ui-label">Mission Name</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {mission.mission.missionName ?? mission.mission.name}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  OrbitNow is currently building mission pages from the live launch
                  board, so this view focuses on the most decision-useful countdown
                  context first: schedule, provider, target orbit, and the current
                  status state.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

import { CardRefreshButton } from "@/components/CardRefreshButton";
import { SectionCard } from "@/components/SectionCard";
import { formatCoordinate, formatDateTime } from "@/lib/formatters";
import { IssApiResponse } from "@/lib/types";

type IssCardProps = {
  data: IssApiResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
};

export function IssCard({ data, isLoading, error, onRefresh }: IssCardProps) {
  return (
    <SectionCard
      title="Live ISS Tracker"
      eyebrow="Orbit Feed"
      description="Polling our server-side ISS route every 5 seconds."
      action={
        <CardRefreshButton
          isLoading={isLoading}
          label="Refresh now"
          loadingLabel="Refreshing..."
          onRefresh={onRefresh}
        />
      }
      className="ui-card-feature h-full"
      isLoading={isLoading}
      loadingLabel="Updating"
    >
      {isLoading && !data ? (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="ui-panel ui-panel-feature p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ui-label text-cyan-100/72">
                  Current Position
                </p>
                <p className="ui-metric mt-4">
                  {formatCoordinate(data.latitude, "N", "S")}
                </p>
                <p className="ui-submetric mt-2">
                  {formatCoordinate(data.longitude, "E", "W")}
                </p>
              </div>

              <div className="ui-chip ui-chip-live">
                <span className="ui-live-dot" />
                Live
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ui-panel">
              <p className="ui-label">
                Updated
              </p>
              <p className="mt-3 text-sm font-medium text-slate-100">
                {formatDateTime(data.timestamp)}
              </p>
            </div>
            <div className="ui-panel">
              <p className="ui-label">
                Source
              </p>
              <p className="mt-3 text-sm font-medium text-slate-100">
                {data.source}
              </p>
            </div>
          </div>

          <div className="ui-panel grid gap-3 sm:grid-cols-2">
            <div>
              <p className="ui-label">Orbit Mode</p>
              <p className="mt-2 text-sm font-medium text-white">Low Earth orbit</p>
            </div>
            <div>
              <p className="ui-label">Map Sync</p>
              <p className="mt-2 text-sm font-medium text-white">
                Live camera follows station
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Refreshing live orbital position...
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

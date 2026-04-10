"use client";

import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";

type FavoritesDockCardProps = {
  onTrackFavorite: (noradId: number) => void;
};

export function FavoritesDockCard({ onTrackFavorite }: FavoritesDockCardProps) {
  const { preferences } = useOrbitPreferences();
  const favorites = preferences.favoriteObjects.slice(0, 4);

  return (
    <SectionCard
      title="My Orbit"
      eyebrow="Quick Access"
      description="Jump back into your saved satellites and mission picks without leaving the live dashboard."
      className="h-full"
    >
      <div className="space-y-4">
        {favorites.length === 0 ? (
          <div className="ui-panel border-dashed text-sm text-slate-300">
            No favorites saved yet. Save a satellite or launch from the dashboard, or
            set up your preferences in My Orbit.
          </div>
        ) : (
          favorites.map((favorite) => (
            <div
              className="ui-panel flex items-start justify-between gap-3 p-4"
              key={favorite.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="ui-chip">{favorite.type}</span>
                  {favorite.noradId ? (
                    <span className="ui-chip">NORAD {favorite.noradId}</span>
                  ) : null}
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-white">
                  {favorite.label}
                </p>
                <p className="mt-1 text-sm text-slate-300">{favorite.subtitle}</p>
              </div>

              {favorite.noradId ? (
                <button
                  className="ui-btn-secondary rounded-[18px] px-4 py-2.5 text-sm"
                  onClick={() => onTrackFavorite(favorite.noradId!)}
                  type="button"
                >
                  Track
                </button>
              ) : null}
            </div>
          ))
        )}

        <Link className="ui-btn-secondary w-full rounded-[20px] py-3 text-sm" href="/my-orbit">
          Open My Orbit
        </Link>
      </div>
    </SectionCard>
  );
}

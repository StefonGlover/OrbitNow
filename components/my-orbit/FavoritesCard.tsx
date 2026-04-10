"use client";

import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatDateTimeWithPreferences } from "@/lib/formatters";

function favoriteTypeLabel(value: string) {
  switch (value) {
    case "launch":
      return "Launch";
    case "mission":
      return "Mission";
    default:
      return "Satellite";
  }
}

export function FavoritesCard() {
  const { preferences, removeFavoriteObject, sessionUser } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;

  return (
    <SectionCard
      title="Favorites"
      eyebrow="Tracked Objects"
      description="Keep a short list of the missions and tracked objects you revisit most often."
      className="xl:col-span-3"
    >
      <div className="space-y-4">
        {preferences.favoriteObjects.length === 0 ? (
          <div className="ui-panel border-dashed text-sm text-slate-300">
            No favorites saved yet. Use the save actions in Satellite Search and Next
            Launch to build a quick revisit list for your dashboard.
            {sessionUser ? " Your saved list will sync to your account automatically." : ""}
          </div>
        ) : (
          preferences.favoriteObjects.map((favorite) => (
            <div
              className="ui-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between"
              key={favorite.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ui-chip">{favoriteTypeLabel(favorite.type)}</span>
                  {favorite.noradId ? (
                    <span className="ui-chip">NORAD {favorite.noradId}</span>
                  ) : null}
                </div>
                <p className="mt-3 text-base font-semibold text-white">{favorite.label}</p>
                <p className="mt-1 text-sm text-slate-300">{favorite.subtitle}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                  Saved{" "}
                  {formatDateTimeWithPreferences(
                    favorite.savedAt,
                    preferences.display,
                    homeTimeZone,
                  )}
                </p>
              </div>

              <button
                className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                onClick={() => removeFavoriteObject(favorite.id)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

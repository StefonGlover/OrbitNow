"use client";

import Link from "next/link";
import { MissionAccessCard } from "@/components/my-orbit/MissionAccessCard";
import { LocationSettingsCard } from "@/components/my-orbit/LocationSettingsCard";
import { FavoritesCard } from "@/components/my-orbit/FavoritesCard";
import { NewsPreferencesCard } from "@/components/my-orbit/NewsPreferencesCard";
import { NotificationPreferencesCard } from "@/components/my-orbit/NotificationPreferencesCard";
import { DisplayPreferencesCard } from "@/components/my-orbit/DisplayPreferencesCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatDateTimeWithPreferences } from "@/lib/formatters";

export function ProfileSettingsPanel() {
  const { lastSyncedAt, preferences, sessionUser, syncStatus } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;
  const enabledAlertCount = [
    preferences.alerts.issOverheadSoon,
    preferences.alerts.launchReminders,
    preferences.alerts.majorNewsAlerts,
    preferences.alerts.nightlyPlannerDigest,
  ].filter(Boolean).length;

  return (
    <div className="space-y-7 lg:space-y-8">
      <section className="ui-card ui-card-hero">
        <div className="relative z-[1] flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="ui-kicker">Mission Settings</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
              My Orbit
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              Personalize OrbitNow with your observing location, favorite missions,
              preferred news signals, and the console defaults you want every time
              you return.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={`ui-chip ${sessionUser ? "ui-chip-live" : ""}`}>
              {sessionUser ? `Synced to ${sessionUser.email}` : "Saved locally on this device"}
            </span>
            <span className="ui-chip">
              {enabledAlertCount} alert channel{enabledAlertCount === 1 ? "" : "s"} active
            </span>
            <Link className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm" href="/">
              Return to dashboard
            </Link>
          </div>
        </div>

        <div className="relative z-[1] mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="ui-panel ui-panel-feature p-5">
            <p className="ui-label">Home Base</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {preferences.homeLocation?.label ?? "Not set"}
            </p>
          </div>
          <div className="ui-panel p-5">
            <p className="ui-label">Favorites</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {preferences.favoriteObjects.length} saved
            </p>
          </div>
          <div className="ui-panel p-5">
            <p className="ui-label">Alert Channels</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {enabledAlertCount} enabled
            </p>
          </div>
          <div className="ui-panel p-5">
            <p className="ui-label">{sessionUser ? "Last Synced" : "Storage Mode"}</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {sessionUser && lastSyncedAt
                ? formatDateTimeWithPreferences(
                    lastSyncedAt,
                    preferences.display,
                    homeTimeZone,
                  )
                : syncStatus === "error"
                  ? "Sync issue"
                  : "Local-first"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-6">
        <MissionAccessCard />
        <LocationSettingsCard />
        <FavoritesCard />
        <NotificationPreferencesCard />
        <NewsPreferencesCard />
        <DisplayPreferencesCard />
      </div>
    </div>
  );
}

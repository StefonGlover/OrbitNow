"use client";

import { FormEvent, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatDateTimeWithPreferences } from "@/lib/formatters";

const inputClassName = "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

type AuthMode = "register" | "login";

function getSyncStateLabel(value: "local-only" | "syncing" | "synced" | "error") {
  switch (value) {
    case "syncing":
      return "Sync in progress";
    case "synced":
      return "Synced";
    case "error":
      return "Needs attention";
    default:
      return "Local only";
  }
}

export function MissionAccessCard() {
  const {
    authPending,
    isSessionLoading,
    lastSyncedAt,
    login,
    logout,
    preferences,
    register,
    sessionUser,
    syncError,
    syncNow,
    syncStatus,
  } = useOrbitPreferences();
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

    try {
      if (mode === "register") {
        await register({ email, password });
        setStatusMessage("Mission access enabled. Your My Orbit settings are now syncing.");
      } else {
        await login({ email, password });
        setStatusMessage("Welcome back. OrbitNow restored your synced console.");
      }

      setPassword("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "OrbitNow could not complete sign-in right now.",
      );
    }
  }

  return (
    <SectionCard
      title="Mission Access"
      eyebrow="Account Sync"
      description="Keep My Orbit synced across devices with a lightweight OrbitNow account while still preserving a local-first fallback."
      className="xl:col-span-3"
      isLoading={authPending || isSessionLoading}
      loadingLabel={authPending ? "Updating Access" : "Restoring Session"}
    >
      <div className="space-y-4">
        {sessionUser ? (
          <>
            <div className="ui-panel ui-panel-feature p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ui-chip ui-chip-live">Mission access online</span>
                <span className="ui-chip">{sessionUser.email}</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-white">
                Your home base, favorites, alert toggles, and display profile now sync to this account.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                OrbitNow still saves locally for instant startup, then keeps the account copy current in the background.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-panel p-4">
                <p className="ui-label">Sync State</p>
                <p className="mt-3 text-base font-semibold text-white">
                  {getSyncStateLabel(syncStatus)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {lastSyncedAt
                    ? `Last synced ${formatDateTimeWithPreferences(
                        lastSyncedAt,
                        preferences.display,
                        homeTimeZone,
                      )}`
                    : "The account is ready to sync as you update settings."}
                </p>
              </div>
              <div className="ui-panel p-4">
                <p className="ui-label">Included In Sync</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Home location with timezone, saved tracked objects, news filters,
                  alert preferences, and display defaults.
                </p>
              </div>
            </div>

            {syncError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                {syncError}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {statusMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="ui-btn-primary"
                disabled={authPending || syncStatus === "syncing"}
                onClick={() => {
                  setStatusMessage(null);
                  setError(null);
                  void syncNow()
                    .then(() =>
                      setStatusMessage("Mission settings synced successfully."),
                    )
                    .catch((syncNowError) =>
                      setError(
                        syncNowError instanceof Error
                          ? syncNowError.message
                          : "OrbitNow could not sync right now.",
                      ),
                    );
                }}
                type="button"
              >
                {syncStatus === "syncing" ? "Syncing..." : "Sync now"}
              </button>
              <button
                className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                disabled={authPending}
                onClick={() => {
                  setStatusMessage(null);
                  setError(null);
                  void logout()
                    .then(() =>
                      setStatusMessage("Signed out. Local preferences remain on this device."),
                    )
                    .catch((logoutError) =>
                      setError(
                        logoutError instanceof Error
                          ? logoutError.message
                          : "OrbitNow could not sign out right now.",
                      ),
                    );
                }}
                type="button"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ui-panel ui-panel-feature p-5">
              <p className="text-lg font-semibold text-white">
                Local-first by default. Cross-device sync unlocks when you sign in.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Use a lightweight OrbitNow account to keep your home base, favorites,
                time display, and alert preferences in sync across browsers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={`ui-choice-pill ${mode === "register" ? "ui-choice-pill-active" : ""}`}
                onClick={() => {
                  setMode("register");
                  setStatusMessage(null);
                  setError(null);
                }}
                type="button"
              >
                Create account
              </button>
              <button
                className={`ui-choice-pill ${mode === "login" ? "ui-choice-pill-active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setStatusMessage(null);
                  setError(null);
                }}
                type="button"
              >
                Sign in
              </button>
            </div>

            <form className="ui-panel grid gap-4 p-4" onSubmit={handleSubmit}>
              <div>
                <label className={labelClassName} htmlFor="missionAccessEmail">
                  Email
                </label>
                <input
                  autoComplete="email"
                  className={inputClassName}
                  id="missionAccessEmail"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@orbitnow.app"
                  type="email"
                  value={email}
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="missionAccessPassword">
                  Password
                </label>
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={inputClassName}
                  id="missionAccessPassword"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  type="password"
                  value={password}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="ui-btn-primary" disabled={authPending} type="submit">
                  {authPending
                    ? mode === "register"
                      ? "Creating..."
                      : "Signing in..."
                    : mode === "register"
                      ? "Create account"
                      : "Sign in"}
                </button>
                <div className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm text-slate-300">
                  Existing local settings will be merged safely after sign-in
                </div>
              </div>
            </form>

            {error || syncError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                {error ?? syncError}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {statusMessage}
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}

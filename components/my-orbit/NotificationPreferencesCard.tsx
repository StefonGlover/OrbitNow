"use client";

import Link from "next/link";
import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatDateTimeWithPreferences } from "@/lib/formatters";

const notificationRows = [
  {
    key: "issOverheadSoon",
    label: "ISS overhead soon",
    description:
      "Check your saved home base for upcoming visible ISS passes and raise a live alert while OrbitNow is open.",
  },
  {
    key: "launchReminders",
    label: "Launch reminders",
    description:
      "Watch the next launch window and surface a reminder when it moves inside your chosen lead time.",
  },
  {
    key: "majorNewsAlerts",
    label: "Major space news alerts",
    description:
      "Surface the highest-signal headline from the AI-guided space news desk.",
  },
  {
    key: "nightlyPlannerDigest",
    label: "Nightly planner digest",
    description:
      "Send one early-evening observing planner summary for your saved home base when OrbitNow finds a useful night to watch.",
  },
] as const;

const leadHourOptions = [1, 3, 6, 12, 24, 48];

function formatHourLabel(hour: number) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const baseHour = normalizedHour % 12 || 12;
  return `${baseHour}:00 ${period}`;
}

function isInternalOrbitUrl(value: string) {
  return value.startsWith("/");
}

export function NotificationPreferencesCard() {
  const {
    dismissAlert,
    notificationPermission,
    notificationsSupported,
    preferences,
    recentAlerts,
    requestNotificationPermission,
    sessionUser,
    updateAlerts,
  } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;

  return (
    <SectionCard
      title="Alert Preferences"
      eyebrow="Live Notifications"
      description="Choose the mission alerts OrbitNow should check on the server, then optionally elevate them into browser notifications while the app is open."
      className="xl:col-span-3"
    >
      <div className="space-y-4">
        <div className="ui-panel ui-panel-feature p-4">
          <p className="ui-label">Delivery Status</p>
          <p className="mt-3 text-base font-semibold text-white">
            {sessionUser
              ? notificationsSupported
                ? notificationPermission === "granted"
                  ? "Browser notifications enabled"
                  : notificationPermission === "denied"
                    ? "Browser notifications blocked"
                    : "In-app alerts ready"
                : "This browser does not support system notifications"
              : "Sign in to activate server-checked alerts"}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            {sessionUser
              ? "OrbitNow can poll the alert pipeline for your account and show alerts here even before browser permission is granted."
              : "Alert preferences can still be saved locally now, but cross-device delivery and server-side checks need Mission Access enabled."}
          </p>
          {sessionUser && notificationsSupported && notificationPermission !== "granted" ? (
            <button
              className="ui-btn-primary mt-4"
              onClick={() => {
                void requestNotificationPermission();
              }}
              type="button"
            >
              {notificationPermission === "denied"
                ? "Notifications blocked in browser"
                : "Enable browser notifications"}
            </button>
          ) : null}
        </div>

        {notificationRows.map((row) => {
          const isEnabled = preferences.alerts[row.key];

          return (
            <div className="ui-panel flex items-center justify-between gap-4 p-4" key={row.key}>
              <div>
                <p className="text-sm font-semibold text-white">{row.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {row.description}
                </p>
              </div>
              <button
                aria-pressed={isEnabled}
                className={`ui-switch ${isEnabled ? "ui-switch-active" : ""}`}
                onClick={() =>
                  updateAlerts({
                    [row.key]: !isEnabled,
                  } as Partial<typeof preferences.alerts>)
                }
                type="button"
              >
                <span className={`ui-switch-thumb ${isEnabled ? "ui-switch-thumb-active" : ""}`} />
              </button>
            </div>
          );
        })}

        <div className="ui-panel p-4">
          <p className="text-sm font-semibold text-white">Launch lead time</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Control how early OrbitNow should fire launch reminders before NET.
          </p>
          <div className="mt-4">
            <select
              className="ui-input"
              onChange={(event) =>
                updateAlerts({
                  launchReminderLeadHours: Number(event.target.value),
                })
              }
              value={preferences.alerts.launchReminderLeadHours}
            >
              {leadHourOptions.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} hour{hours === 1 ? "" : "s"} before launch
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ui-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Quiet hours</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Suppress in-app and browser alerts during your chosen local overnight
                window.
              </p>
            </div>
            <button
              aria-pressed={preferences.alerts.quietHoursEnabled}
              className={`ui-switch ${preferences.alerts.quietHoursEnabled ? "ui-switch-active" : ""}`}
              onClick={() =>
                updateAlerts({
                  quietHoursEnabled: !preferences.alerts.quietHoursEnabled,
                })
              }
              type="button"
            >
              <span
                className={`ui-switch-thumb ${preferences.alerts.quietHoursEnabled ? "ui-switch-thumb-active" : ""}`}
              />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ui-label mb-2 block" htmlFor="quietHoursStart">
                Starts
              </label>
              <select
                className="ui-input"
                id="quietHoursStart"
                onChange={(event) =>
                  updateAlerts({
                    quietHoursStartHour: Number(event.target.value),
                  })
                }
                value={preferences.alerts.quietHoursStartHour}
              >
                {Array.from({ length: 24 }).map((_, hour) => (
                  <option key={`start-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ui-label mb-2 block" htmlFor="quietHoursEnd">
                Ends
              </label>
              <select
                className="ui-input"
                id="quietHoursEnd"
                onChange={(event) =>
                  updateAlerts({
                    quietHoursEndHour: Number(event.target.value),
                  })
                }
                value={preferences.alerts.quietHoursEndHour}
              >
                {Array.from({ length: 24 }).map((_, hour) => (
                  <option key={`end-${hour}`} value={hour}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {sessionUser ? (
          recentAlerts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="ui-label">Recent Alerts</p>
                <span className="ui-chip">{recentAlerts.length} active</span>
              </div>
              {recentAlerts.map((alert) => (
                <div className="ui-panel p-4" key={alert.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ui-chip ui-chip-live">{alert.type.replace("-", " ")}</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          {formatDateTimeWithPreferences(
                            alert.createdAt,
                            preferences.display,
                            homeTimeZone,
                          )}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">{alert.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{alert.body}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {alert.actionUrl ? (
                        isInternalOrbitUrl(alert.actionUrl) ? (
                          <Link
                            className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                            href={alert.actionUrl}
                          >
                            Open
                          </Link>
                        ) : (
                          <a
                            className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                            href={alert.actionUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open
                          </a>
                        )
                      ) : null}
                      <button
                        className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm"
                        onClick={() => dismissAlert(alert.id)}
                        type="button"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ui-panel border-dashed text-sm text-slate-300">
              No alerts have fired for this account yet. Once a tracked condition is met,
              OrbitNow will surface it here and, if allowed, send a browser notification.
            </div>
          )
        ) : null}
      </div>
    </SectionCard>
  );
}

"use client";

import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { formatDateTimeWithPreferences } from "@/lib/formatters";
import {
  OrbitMeasurementSystem,
  OrbitThemeMode,
  OrbitTimeFormat,
  OrbitTimeZoneMode,
} from "@/lib/orbit-preferences";

type OptionButtonGroupProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
};

function OptionButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: OptionButtonGroupProps<T>) {
  return (
    <div className="ui-panel p-4">
      <p className="ui-label">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={`ui-choice-pill ${value === option.value ? "ui-choice-pill-active" : ""}`}
            disabled={option.disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DisplayPreferencesCard() {
  const { preferences, updateDisplay } = useOrbitPreferences();
  const homeTimeZone = preferences.homeLocation?.timeZone ?? null;

  return (
    <SectionCard
      title="Display Preferences"
      eyebrow="Console View"
      description="Tune presentation details such as theme, units, and time display to match how you monitor the dashboard."
      className="xl:col-span-3"
    >
      <div className="space-y-3">
        <OptionButtonGroup<OrbitThemeMode>
          label="Theme"
          onChange={(value) => updateDisplay({ themeMode: value })}
          options={[
            { value: "midnight", label: "Midnight" },
            { value: "nebula", label: "Nebula" },
          ]}
          value={preferences.display.themeMode}
        />

        <OptionButtonGroup<OrbitMeasurementSystem>
          label="Units"
          onChange={(value) => updateDisplay({ measurementSystem: value })}
          options={[
            { value: "metric", label: "Metric" },
            { value: "imperial", label: "Imperial" },
          ]}
          value={preferences.display.measurementSystem}
        />

        <OptionButtonGroup<OrbitTimeFormat>
          label="Time Format"
          onChange={(value) => updateDisplay({ timeFormat: value })}
          options={[
            { value: "12h", label: "12-hour" },
            { value: "24h", label: "24-hour" },
          ]}
          value={preferences.display.timeFormat}
        />

        <OptionButtonGroup<OrbitTimeZoneMode>
          label="Time Zone"
          onChange={(value) => updateDisplay({ timeZoneMode: value })}
          options={[
            { value: "browser", label: "Browser Local" },
            { value: "utc", label: "UTC" },
            {
              value: "home",
              label: homeTimeZone ? "Home Base" : "Home Base Unavailable",
              disabled: !homeTimeZone,
            },
          ]}
          value={preferences.display.timeZoneMode}
        />

        <div className="ui-panel ui-panel-feature p-4">
          <p className="ui-label">Preview</p>
          <p className="mt-3 text-sm font-medium text-white">
            {formatDateTimeWithPreferences(
              new Date().toISOString(),
              preferences.display,
              homeTimeZone,
            )}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Launch times, pass windows, saved favorites, and the news desk can all
            reflect this presentation profile.
          </p>
          {homeTimeZone ? (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
              Home timezone: {homeTimeZone}
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

"use client";

import { SectionCard } from "@/components/SectionCard";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { ORBIT_NEWS_TOPICS } from "@/lib/orbit-preferences";

export function NewsPreferencesCard() {
  const { preferences, toggleNewsTopic } = useOrbitPreferences();

  return (
    <SectionCard
      title="News Preferences"
      eyebrow="Signal Filters"
      description="Choose the topics that matter most so OrbitNow can tune the AI news desk toward your interests."
      className="xl:col-span-3"
    >
      <div className="space-y-4">
        <div className="ui-panel ui-panel-feature p-4">
          <p className="ui-label">Active Topics</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {preferences.newsTopics.length}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            Selected topics guide the current-awareness layer in the Latest Space
            News section after the page hydrates.
          </p>
        </div>

        <div className="grid gap-3">
          {ORBIT_NEWS_TOPICS.map((topic) => {
            const isSelected = preferences.newsTopics.includes(topic.value);

            return (
              <button
                aria-pressed={isSelected}
                className={`ui-choice-card text-left ${isSelected ? "ui-choice-card-active" : ""}`}
                key={topic.value}
                onClick={() => toggleNewsTopic(topic.value)}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{topic.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {topic.description}
                    </p>
                  </div>
                  <span className={`ui-choice-indicator ${isSelected ? "ui-choice-indicator-active" : ""}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";
import { SectionCard } from "@/components/SectionCard";
import { ApiRouteResponse, WhatIfInsightApiResponse } from "@/lib/types";

export function WhatIfInsightCard() {
  const { preferences } = useOrbitPreferences();
  const suggestionPrompts = [
    preferences.homeLocation
      ? `What if the ISS passed directly over ${preferences.homeLocation.label} tonight?`
      : "What if the ISS had to raise its orbit tonight?",
    "What if the next launch slips by 24 hours?",
    "What if I tracked a satellite close to the ISS path?",
  ];
  const [question, setQuestion] = useState(suggestionPrompts[0]);
  const [result, setResult] = useState<WhatIfInsightApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/what-if", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      const json = (await response.json()) as ApiRouteResponse<WhatIfInsightApiResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to generate a what-if insight." : json.error.message,
        );
      }

      setResult(json.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate a what-if insight.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionCard
      title="What-If Mission Lab"
      eyebrow="Scenario Builder"
      description="Ask a curiosity-driven question and OrbitNow will answer using the live dashboard context."
      className="ui-card-feature md:col-span-2 xl:col-span-4"
      isLoading={isLoading}
      loadingLabel="Thinking"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {suggestionPrompts.map((prompt) => (
            <button
              className="ui-chip"
              key={prompt}
              onClick={() => setQuestion(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form className="ui-panel space-y-4 p-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="ui-label mb-2 block"
              htmlFor="whatIfQuestion"
            >
              Your What-If Question
            </label>
            <textarea
              className="ui-input min-h-[148px] px-4 py-4 leading-7"
              id="whatIfQuestion"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What if the ISS had to dodge debris during a visible pass?"
              value={question}
            />
          </div>

          <button
            className="ui-btn-primary"
            disabled={isLoading || question.trim().length < 6}
            type="submit"
          >
            {isLoading ? "Exploring scenario..." : "Generate what-if insight"}
          </button>
        </form>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="ui-panel ui-panel-feature p-5">
              <p className="ui-kicker text-cyan-100/80">
                {result.response.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-white">{result.response.answer}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Based on: {result.prompt}
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="ui-panel">
                <p className="ui-label">
                  Assumptions
                </p>
                <div className="mt-3 grid gap-2">
                  {result.response.assumptions.map((assumption) => (
                    <p className="text-sm text-slate-200" key={assumption}>
                      {assumption}
                    </p>
                  ))}
                </div>
              </div>

              <div className="ui-panel">
                <p className="ui-label">
                  Related Fact
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {result.response.relatedFact}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="ui-panel border-dashed text-sm text-slate-300">
            Ask a scenario question and OrbitNow will turn the current ISS, launch,
            astronaut, and APOD data into a quick thought experiment.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

import { AiDashboardContext } from "@/lib/ai-context";
import { OrbitNewsTopic } from "@/lib/orbit-preferences";
import {
  CuriosityInsightsApiResponse,
  LatestSpaceNewsFeedResponse,
  MissionBriefApiResponse,
  OpenAIResponsesApiResponse,
  SpaceNewsIntelligence,
  ViewingConditionsApiResponse,
  WhatIfInsightApiResponse,
} from "@/lib/types";
import { serverConfigError, upstreamError } from "@/lib/server/api";
import { withServerCache } from "@/lib/server/cache";
import { ViewingBriefInputs } from "@/lib/viewing-brief";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

type ResponseExtractionMessages = {
  refusal: string;
  empty: string;
};

type StructuredGenerationOptions = {
  cacheKey: string;
  ttlMs: number;
  staleWhileErrorMs: number;
  timeoutMs?: number;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPayload: unknown;
  messages: ResponseExtractionMessages & {
    timeout: string;
    rateLimit: string;
    failure: string;
  };
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw serverConfigError("OPENAI_API_KEY is not configured on the server.");
  }

  return key;
}

function extractResponseText(
  response: OpenAIResponsesApiResponse,
  messages: ResponseExtractionMessages,
) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text") {
        return content.text;
      }

      if (content.type === "refusal") {
        throw upstreamError(messages.refusal, {
          reason: content.refusal.slice(0, 200),
        });
      }
    }
  }

  throw upstreamError(messages.empty);
}

async function requestStructuredJson<T>(
  options: StructuredGenerationOptions,
): Promise<T> {
  return withServerCache(options.cacheKey, {
    ttlMs: options.ttlMs,
    staleWhileErrorMs: options.staleWhileErrorMs,
    loader: async () => {
      const apiKey = requireOpenAiKey();
      let attempt = 0;

      while (true) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeoutMs ?? 25_000,
        );

        try {
          const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: DEFAULT_OPENAI_MODEL,
              input: [
                {
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: options.systemPrompt,
                    },
                  ],
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: JSON.stringify(options.userPayload),
                    },
                  ],
                },
              ],
              text: {
                format: {
                  type: "json_schema",
                  name: options.schemaName,
                  strict: true,
                  schema: options.schema,
                },
              },
            }),
            cache: "no-store",
            signal: controller.signal,
          });

          if (!response.ok) {
            const details = await response.text();

            if (attempt < 1 && [429, 500, 502, 503, 504].includes(response.status)) {
              attempt += 1;
              await delay(1_000 * attempt);
              continue;
            }

            const message =
              response.status === 429
                ? options.messages.rateLimit
                : options.messages.failure;

            throw upstreamError(message, {
              status: response.status,
              details: details.slice(0, 200),
            });
          }

          const json = (await response.json()) as OpenAIResponsesApiResponse;
          const text = extractResponseText(json, options.messages);

          return JSON.parse(text) as T;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            if (attempt < 1) {
              attempt += 1;
              await delay(1_000 * attempt);
              continue;
            }

            throw upstreamError(options.messages.timeout);
          }

          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    },
  });
}

function createOpenAiEnvelope<T>(payload: T) {
  return {
    source: "OpenAI" as const,
    model: DEFAULT_OPENAI_MODEL,
    generatedAt: new Date().toISOString(),
    ...payload,
  };
}

function getUniqueCrafts(context: AiDashboardContext) {
  return Array.from(
    new Set(context.astronauts.people.map((person) => person.craft)),
  ).join(", ");
}

export async function generateMissionBrief(
  input: AiDashboardContext,
): Promise<MissionBriefApiResponse> {
  const cacheKey = [
    "mission-brief",
    input.iss.timestamp,
    input.astronauts.totalPeople,
    input.launch.launch.id,
    input.apod.item.date,
  ].join(":");

  const briefing = await requestStructuredJson<MissionBriefApiResponse["briefing"]>({
    cacheKey,
    ttlMs: 900_000,
    staleWhileErrorMs: 3_600_000,
    schemaName: "mission_brief",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        highlights: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
        watchNow: { type: "string" },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
        dataPoints: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
            required: ["label", "value"],
          },
        },
      },
      required: [
        "title",
        "summary",
        "highlights",
        "watchNow",
        "nextSteps",
        "dataPoints",
      ],
    },
    systemPrompt:
      "You generate concise, engaging space dashboard briefings. Return valid JSON only.",
    userPayload: {
      task:
        "Create a mission brief for a live space dashboard. Keep it factual, exciting, and useful for a casual space fan. Use only the supplied data.",
      formatRules: {
        title: "short title under 8 words",
        summary: "2 sentences max",
        highlights: "3 short bullet-ready strings",
        watchNow: "1 short sentence",
        nextSteps: "3 short action suggestions",
        dataPoints: "4 label/value pairs max",
      },
      data: input,
    },
    messages: {
      refusal: "OpenAI refused to generate a mission brief.",
      empty: "OpenAI did not return any readable mission brief content.",
      timeout: "OpenAI mission brief generation timed out.",
      rateLimit: "OpenAI is rate-limiting mission brief generation right now.",
      failure: "OpenAI mission brief request failed.",
    },
  });

  return createOpenAiEnvelope({ briefing });
}

export async function generateCuriosityInsights(
  input: AiDashboardContext,
): Promise<CuriosityInsightsApiResponse> {
  const cacheKey = [
    "curiosity-insights",
    input.iss.timestamp,
    input.astronauts.totalPeople,
    input.launch.launch.id,
    input.apod.item.date,
  ].join(":");

  const parsed = await requestStructuredJson<{
    insights: CuriosityInsightsApiResponse["insights"];
  }>({
    cacheKey,
    ttlMs: 1_800_000,
    staleWhileErrorMs: 7_200_000,
    schemaName: "curiosity_insights",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        insights: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              insight: { type: "string" },
              whyItMatters: { type: "string" },
            },
            required: ["title", "insight", "whyItMatters"],
          },
        },
      },
      required: ["insights"],
    },
    systemPrompt:
      "You generate curiosity-driven insights for a space dashboard. Keep them factual, friendly, and memorable. Return valid JSON only.",
    userPayload: {
      task:
        "Create three short 'Did you know?' style insights for a live space dashboard. Blend supplied live data with broadly known astronomy context. Do not invent unsupported specifics. Keep each insight punchy and useful for a casual reader.",
      formatRules: {
        title: "4 to 7 words",
        insight: "1 to 2 sentences",
        whyItMatters: "1 short sentence",
      },
      data: input,
    },
    messages: {
      refusal: "OpenAI refused to generate curiosity insights.",
      empty: "OpenAI did not return any readable curiosity insight content.",
      timeout: "OpenAI curiosity insight generation timed out.",
      rateLimit: "OpenAI is rate-limiting curiosity insight generation right now.",
      failure: "OpenAI curiosity insight request failed.",
    },
  });

  return createOpenAiEnvelope({ insights: parsed.insights });
}

export async function generateWhatIfInsight(input: {
  question: string;
  context: AiDashboardContext;
}): Promise<WhatIfInsightApiResponse> {
  const normalizedQuestion = input.question.trim();
  const cacheKey = [
    "what-if",
    normalizedQuestion.toLowerCase().slice(0, 160),
    input.context.iss.timestamp,
    input.context.launch.launch.id,
    input.context.apod.item.date,
  ].join(":");

  const response = await requestStructuredJson<WhatIfInsightApiResponse["response"]>({
    cacheKey,
    ttlMs: 3_600_000,
    staleWhileErrorMs: 21_600_000,
    timeoutMs: 30_000,
    schemaName: "what_if_insight",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        answer: { type: "string" },
        assumptions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
        },
        relatedFact: { type: "string" },
      },
      required: ["title", "answer", "assumptions", "relatedFact"],
    },
    systemPrompt:
      "You answer curiosity-driven what-if questions for a public space dashboard. Stay educational, concise, and grounded. Use the live context provided, make assumptions explicit, and avoid pretending to run an exact simulation. Return valid JSON only.",
    userPayload: {
      task:
        "Answer a user's what-if question using the live dashboard context and general astronomy knowledge. Be imaginative but scientifically responsible.",
      formatRules: {
        title: "short title under 7 words",
        answer: "2 short paragraphs max",
        assumptions: "3 brief assumptions or caveats",
        relatedFact: "1 memorable supporting fact",
      },
      question: normalizedQuestion,
      data: input.context,
    },
    messages: {
      refusal: "OpenAI refused to generate a what-if insight.",
      empty: "OpenAI did not return any readable what-if insight content.",
      timeout: "OpenAI what-if insight generation timed out.",
      rateLimit: "OpenAI is rate-limiting what-if insight generation right now.",
      failure: "OpenAI what-if insight request failed.",
    },
  });

  return createOpenAiEnvelope({
    prompt: normalizedQuestion,
    response,
  });
}

export async function generateViewingConditions(input: {
  observer: ViewingBriefInputs;
  context: AiDashboardContext;
}): Promise<ViewingConditionsApiResponse> {
  const cacheKey = [
    "viewing-conditions",
    input.observer.latitude.toFixed(2),
    input.observer.longitude.toFixed(2),
    input.observer.approximateLighting,
    input.context.iss.timestamp,
    Math.floor(Date.now() / 900_000),
  ].join(":");

  const response = await requestStructuredJson<{
    skySummary: string;
    viewingOutlook: string;
    recommendedAction: string;
    confidenceNote: string;
    factors: ViewingConditionsApiResponse["factors"];
  }>({
    cacheKey,
    ttlMs: 900_000,
    staleWhileErrorMs: 3_600_000,
    schemaName: "viewing_conditions",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        skySummary: { type: "string" },
        viewingOutlook: { type: "string" },
        recommendedAction: { type: "string" },
        confidenceNote: { type: "string" },
        factors: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
            required: ["label", "value"],
          },
        },
      },
      required: [
        "skySummary",
        "viewingOutlook",
        "recommendedAction",
        "confidenceNote",
        "factors",
      ],
    },
    systemPrompt:
      "You generate concise astronomy viewing briefs for a space dashboard. Be transparent: you do not have live weather measurements in this task. Never claim measured cloud cover, visibility distance, humidity, wind, or temperature. Return valid JSON only.",
    userPayload: {
      task:
        "Create an AI viewing-conditions brief for a skywatcher. Use the observer location, approximate solar lighting, current UTC time, and live orbital dashboard context. Keep it useful, grounded, and explicit about uncertainty.",
      formatRules: {
        skySummary: "2 short sentences max",
        viewingOutlook: "1 concise sentence",
        recommendedAction: "1 concise sentence",
        confidenceNote:
          "1 sentence that clearly says this is not live meteorological data",
        factors: "4 short label/value pairs",
      },
      data: input,
    },
    messages: {
      refusal: "OpenAI refused to generate a viewing conditions brief.",
      empty: "OpenAI did not return any readable viewing conditions content.",
      timeout: "OpenAI viewing conditions generation timed out.",
      rateLimit: "OpenAI is rate-limiting viewing conditions generation right now.",
      failure: "OpenAI viewing conditions request failed.",
    },
  });

  return createOpenAiEnvelope({
    locationName: input.observer.locationName,
    latitude: input.observer.latitude,
    longitude: input.observer.longitude,
    ...response,
  });
}

export async function generateSpaceNewsIntelligence(input: {
  feed: LatestSpaceNewsFeedResponse;
  preferredTopics?: OrbitNewsTopic[];
}): Promise<SpaceNewsIntelligence> {
  const stories = [input.feed.featuredStory, ...input.feed.articles].filter(
    Boolean,
  );
  const cacheKey = [
    "space-news-intelligence",
    ...(input.preferredTopics ?? []),
    ...stories.map((story) => `${story!.id}-${story!.publishedAt}`),
  ].join(":");

  const response = await requestStructuredJson<{
    featuredStoryId: number | null;
    title: string;
    summary: string;
    whyNow: string;
    watchList: string[];
    signals: SpaceNewsIntelligence["signals"];
  }>({
    cacheKey,
    ttlMs: 600_000,
    staleWhileErrorMs: 3_600_000,
    schemaName: "space_news_intelligence",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        featuredStoryId: {
          type: ["integer", "null"],
        },
        title: { type: "string" },
        summary: { type: "string" },
        whyNow: { type: "string" },
        watchList: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
        },
        signals: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
            required: ["label", "value"],
          },
        },
      },
      required: [
        "featuredStoryId",
        "title",
        "summary",
        "whyNow",
        "watchList",
        "signals",
      ],
    },
    systemPrompt:
      "You are an editor creating a premium current-awareness briefing for a live space dashboard. Use only the supplied article data. Stay factual, concise, and current. Return valid JSON only.",
    userPayload: {
      task:
        "Choose the most consequential featured story from the provided recent space articles and create a concise AI news briefing for OrbitNow.",
      formatRules: {
        featuredStoryId:
          "must match one of the provided article ids, or null if no clear choice exists",
        title: "short desk-style heading under 7 words",
        summary: "2 sentences max",
        whyNow: "1 short sentence explaining why this matters now",
        watchList: "3 short watch-item strings",
        signals: "3 short label/value pairs grounded in the supplied stories",
      },
      data: {
        feedFetchedAt: input.feed.fetchedAt,
        totalResults: input.feed.totalResults,
        preferredTopics: input.preferredTopics ?? [],
        stories,
      },
    },
    messages: {
      refusal: "OpenAI refused to generate the space news briefing.",
      empty: "OpenAI did not return any readable news intelligence content.",
      timeout: "OpenAI news intelligence generation timed out.",
      rateLimit: "OpenAI is rate-limiting the news intelligence briefing right now.",
      failure: "OpenAI news intelligence request failed.",
    },
  });

  return createOpenAiEnvelope(response);
}

export function createFallbackMissionBrief(
  input: AiDashboardContext,
): MissionBriefApiResponse {
  return {
    source: "OpenAI",
    model: "fallback-summary",
    generatedAt: new Date().toISOString(),
    briefing: {
      title: "Live Orbit Snapshot",
      summary:
        `The ISS is currently over ${input.iss.latitude.toFixed(1)}°, ${input.iss.longitude.toFixed(1)}° while ${input.astronauts.totalPeople} people remain in space. The next featured launch is ${input.launch.launch.name}.`,
      highlights: [
        `${input.astronauts.totalPeople} astronauts are currently off-world.`,
        `Next launch status: ${input.launch.launch.status}.`,
        `Today's APOD theme: ${input.apod.item.title}.`,
      ],
      watchNow:
        "Track the ISS path live on the map and compare it with the next scheduled launch window.",
      nextSteps: [
        "Refresh the mission brief in a few minutes for a new AI summary.",
        "Open the APOD section for NASA's daily astronomy feature.",
        "Track a satellite by NORAD ID to compare its path against the ISS.",
      ],
      dataPoints: [
        {
          label: "ISS Position",
          value: `${input.iss.latitude.toFixed(1)}°, ${input.iss.longitude.toFixed(1)}°`,
        },
        {
          label: "People in Space",
          value: String(input.astronauts.totalPeople),
        },
        {
          label: "Next Launch",
          value: input.launch.launch.name,
        },
        {
          label: "APOD",
          value: input.apod.item.title,
        },
      ],
    },
  };
}

export function createFallbackCuriosityInsights(
  input: AiDashboardContext,
): CuriosityInsightsApiResponse {
  const crafts = getUniqueCrafts(input);

  return {
    source: "OpenAI",
    model: "fallback-summary",
    generatedAt: new Date().toISOString(),
    insights: [
      {
        title: "ISS Is Still Flying Fast",
        insight:
          "The International Space Station moves at about 17,500 mph, which is fast enough to loop around Earth in roughly 90 minutes.",
        whyItMatters:
          "That speed is why a live marker can shift dramatically across the map in just a few refreshes.",
      },
      {
        title: "Humans Are Truly Off-World",
        insight:
          `${input.astronauts.totalPeople} people are currently in space, with crew activity tied to ${crafts || "active spacecraft"} right now.`,
        whyItMatters:
          "Every crewed orbit keeps long-duration research, maintenance, and international coordination going.",
      },
      {
        title: "Space Has Two Storylines",
        insight:
          `OrbitNow is showing both motion and meaning at once: ${input.launch.launch.name} is the next launch on deck, while APOD highlights "${input.apod.item.title}".`,
        whyItMatters:
          "One feed tracks where missions are going next, and the other helps explain why the sky keeps fascinating us.",
      },
    ],
  };
}

export function createFallbackWhatIfInsight(input: {
  question: string;
  context: AiDashboardContext;
}): WhatIfInsightApiResponse {
  return {
    source: "OpenAI",
    model: "fallback-summary",
    generatedAt: new Date().toISOString(),
    prompt: input.question,
    response: {
      title: "What If, In Context",
      answer:
        `A grounded way to think about "${input.question}" is to anchor it to the live dashboard first: the ISS is currently near ${input.context.iss.latitude.toFixed(1)}°, ${input.context.iss.longitude.toFixed(1)}°, ${input.context.astronauts.totalPeople} people are in space, and the next launch on deck is ${input.context.launch.launch.name}. Any deeper answer would depend on mission rules, orbital mechanics, and vehicle margins, so this should be treated as a high-level thought experiment rather than an exact simulation.`,
      assumptions: [
        "This answer uses the current OrbitNow dashboard snapshot as context.",
        "It assumes normal mission safety rules and standard orbital mechanics.",
        "It is a simplified educational explanation, not a flight dynamics calculation.",
      ],
      relatedFact:
        `Today's APOD, "${input.context.apod.item.title}", is a useful reminder that space questions often connect orbital mechanics with the bigger astronomical picture.`,
    },
  };
}

export function createFallbackViewingConditions(input: {
  observer: ViewingBriefInputs;
  context: AiDashboardContext;
}): ViewingConditionsApiResponse {
  const lightingSummary =
    input.observer.approximateLighting === "Night"
      ? "The sky should be in its darkest local phase right now."
      : input.observer.approximateLighting === "Twilight"
        ? "The sky appears to be near a twilight transition at this longitude."
        : "The sky is likely bright from daytime sunlight at this longitude.";

  const outlook =
    input.observer.approximateLighting === "Night"
      ? "If local skies are clear, this is the strongest window for naked-eye or binocular viewing."
      : input.observer.approximateLighting === "Twilight"
        ? "Viewing conditions may improve as the sky darkens, especially for brighter targets."
        : "Deep-sky viewing is likely limited until later, but the dashboard still helps with timing and tracking.";

  return {
    source: "OpenAI",
    model: "fallback-summary",
    generatedAt: new Date().toISOString(),
    locationName: input.observer.locationName,
    latitude: input.observer.latitude,
    longitude: input.observer.longitude,
    skySummary:
      `${lightingSummary} The ISS is currently live on the map, and OrbitNow can still help you plan around that path and the next launch window.`,
    viewingOutlook: outlook,
    recommendedAction:
      input.observer.approximateLighting === "Night"
        ? "Use the live ISS track and visible-passes tools now, then compare with the AI mission brief for extra context."
        : "Use this as a planning snapshot, then come back closer to local night for the best skywatching experience.",
    confidenceNote:
      "This AI brief does not use live cloud, visibility, temperature, or wind measurements, so real local weather can still change the experience.",
    factors: [
      {
        label: "Local Solar Time",
        value: `${input.observer.approximateLocalSolarTime} approx.`,
      },
      {
        label: "Lighting",
        value: input.observer.approximateLighting,
      },
      {
        label: "Hemisphere",
        value: `${input.observer.hemisphere} • ${input.observer.season}`,
      },
      {
        label: "Next Launch",
        value: input.context.launch.launch.name,
      },
    ],
  };
}

export function createFallbackSpaceNewsIntelligence(input: {
  feed: LatestSpaceNewsFeedResponse;
  preferredTopics?: OrbitNewsTopic[];
}): SpaceNewsIntelligence {
  const stories = [input.feed.featuredStory, ...input.feed.articles].filter(
    Boolean,
  );
  const leadStory = stories[0] ?? null;
  const followUpStories = stories.slice(1, 4);

  return {
    source: "OpenAI",
    model: "fallback-summary",
    generatedAt: new Date().toISOString(),
    featuredStoryId: leadStory?.id ?? null,
    title: leadStory ? "Current Orbit Brief" : "Current Feed Brief",
    summary: leadStory
      ? `${leadStory.title} is the current lead item in the space reporting stream, with fresh coverage joined by ${followUpStories.length} additional recent stories. OrbitNow is surfacing this as the most immediate headline until a newer cluster of reporting arrives.`
      : "OrbitNow is waiting on a fresh cluster of recent space stories to build the live news briefing.",
    whyNow: leadStory
      ? `This matters now because it is the freshest high-signal story in the current space reporting window${input.preferredTopics?.length ? `, with emphasis on ${input.preferredTopics.join(", ")}` : ""}.`
      : "This matters now because the intelligence panel updates as new stories land in the feed.",
    watchList: leadStory
      ? [
          `Watch whether ${leadStory.source} coverage is joined by additional outlets.`,
          followUpStories[0]
            ? `Compare against ${followUpStories[0].title}.`
            : "Look for follow-up reporting and official statements.",
          "Refresh the feed later for a new AI-prioritized briefing.",
        ]
      : [
          "Wait for a fresh set of articles to arrive.",
          "Refresh the feed shortly for a new briefing.",
          "Use the rest of OrbitNow for live orbital context in the meantime.",
        ],
    signals: [
      {
        label: "Stories Loaded",
        value: String(stories.length),
      },
      {
        label: "Lead Source",
        value: leadStory?.source ?? "No source yet",
      },
      {
        label: "Feed Snapshot",
        value: input.feed.fetchedAt,
      },
    ],
  };
}

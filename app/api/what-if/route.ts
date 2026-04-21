import { fetchAiDashboardContext } from "@/lib/ai-context";
import {
  createFallbackWhatIfInsight,
  generateWhatIfInsight,
} from "@/lib/openai";
import { badRequest, errorResponse, successResponse } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { parseRequiredText } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, {
      scope: "ai-what-if",
      maxRequests: 12,
      windowMs: 1000 * 60 * 15,
      message: "Scenario requests are coming in too quickly. Please wait a moment and try again.",
    });

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw badRequest("Request body must be valid JSON.");
    }

    const question = parseRequiredText(
      typeof body === "object" &&
        body !== null &&
        "question" in body &&
        typeof body.question === "string"
        ? body.question
        : null,
      "question",
      { minLength: 6, maxLength: 320 },
    );

    const context = await fetchAiDashboardContext();

    const insight = await generateWhatIfInsight({
      question,
      context,
    }).catch(() =>
      createFallbackWhatIfInsight({
        question,
        context,
      }),
    );

    // User prompts stay server-side. The browser only talks to this local route,
    // while OpenAI requests and API keys remain on the server.
    return successResponse(insight);
  } catch (error) {
    return errorResponse(error);
  }
}

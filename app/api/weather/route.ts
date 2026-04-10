import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/api";
import { fetchAiDashboardContext } from "@/lib/ai-context";
import {
  createFallbackViewingConditions,
  generateViewingConditions,
} from "@/lib/openai";
import { parseLatitude, parseLongitude } from "@/lib/server/validation";
import { buildViewingBriefInputs } from "@/lib/viewing-brief";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const latitude = parseLatitude(request.nextUrl.searchParams.get("lat"));
    const longitude = parseLongitude(request.nextUrl.searchParams.get("lon"));
    const observer = buildViewingBriefInputs(latitude, longitude);
    const context = await fetchAiDashboardContext();

    // This route now produces an AI viewing brief rather than measured weather.
    // The browser still only talks to our local API route, so the OpenAI key
    // stays server-side and never reaches client code.
    const viewingBrief = await generateViewingConditions({
      observer,
      context,
    }).catch(() =>
      createFallbackViewingConditions({
        observer,
        context,
      }),
    );

    return successResponse(viewingBrief, {
      cacheSeconds: 900,
      staleWhileRevalidateSeconds: 1800,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

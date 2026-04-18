import { NextResponse } from "next/server";
import {
  ApiFailureResponse,
  ApiSuccessResponse,
} from "@/lib/types";

export class RouteError extends Error {
  code: string;
  status: number;
  details?: Record<string, string | number | boolean | null | undefined>;

  constructor(input: {
    message: string;
    code: string;
    status: number;
    details?: Record<string, string | number | boolean | null | undefined>;
  }) {
    super(input.message);
    this.name = "RouteError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export function badRequest(
  message: string,
  details?: Record<string, string | number | boolean | null | undefined>,
) {
  return new RouteError({
    message,
    code: "BAD_REQUEST",
    status: 400,
    details,
  });
}

export function unauthorized(message: string) {
  return new RouteError({
    message,
    code: "UNAUTHORIZED",
    status: 401,
  });
}

export function conflictError(message: string) {
  return new RouteError({
    message,
    code: "CONFLICT",
    status: 409,
  });
}

export function tooManyRequests(
  message: string,
  details?: Record<string, string | number | boolean | null | undefined>,
) {
  return new RouteError({
    message,
    code: "TOO_MANY_REQUESTS",
    status: 429,
    details,
  });
}

export function serverConfigError(message: string) {
  return new RouteError({
    message,
    code: "SERVER_CONFIG_ERROR",
    status: 500,
  });
}

export function upstreamError(message: string, details?: Record<string, string | number>) {
  return new RouteError({
    message,
    code: "UPSTREAM_ERROR",
    status: 502,
    details,
  });
}

export function successResponse<T>(
  data: T,
  options?: {
    cacheSeconds?: number;
    staleWhileRevalidateSeconds?: number;
    status?: number;
  },
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      fetchedAt: new Date().toISOString(),
      cachedForSeconds: options?.cacheSeconds,
    },
  };

  return NextResponse.json(body, {
    status: options?.status ?? 200,
    headers: createCacheHeaders(
      options?.cacheSeconds ?? 0,
      options?.staleWhileRevalidateSeconds,
    ),
  });
}

export function errorResponse(error: unknown) {
  const routeError =
    error instanceof RouteError
      ? error
      : new RouteError({
          message:
            error instanceof Error ? error.message : "An unexpected error occurred.",
          code: "INTERNAL_SERVER_ERROR",
          status: 500,
        });

  const body: ApiFailureResponse = {
    success: false,
    error: {
      code: routeError.code,
      message: routeError.message,
      details: routeError.details,
    },
    meta: {
      fetchedAt: new Date().toISOString(),
    },
  };

  return NextResponse.json(body, {
    status: routeError.status,
    headers: createCacheHeaders(0),
  });
}

function createCacheHeaders(cacheSeconds: number, staleWhileRevalidateSeconds = 0) {
  if (cacheSeconds <= 0) {
    return {
      "Cache-Control": "no-store",
    };
  }

  const swrPart =
    staleWhileRevalidateSeconds > 0
      ? `, stale-while-revalidate=${staleWhileRevalidateSeconds}`
      : "";

  return {
    "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}${swrPart}`,
  };
}

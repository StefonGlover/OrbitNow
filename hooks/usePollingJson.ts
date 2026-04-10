"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRouteResponse } from "@/lib/types";

type PollingResult<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

type UsePollingJsonOptions<T> = {
  initialData?: T | null;
  revalidateOnMount?: boolean;
};

export function usePollingJson<T>(
  url: string,
  intervalMs?: number,
  options?: UsePollingJsonOptions<T>,
): PollingResult<T> {
  const [data, setData] = useState<T | null>(options?.initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(options?.initialData ? false : true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(Boolean(options?.initialData));

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isInitialLoad = !hasLoadedRef.current;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      const json = (await response.json()) as ApiRouteResponse<T>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success ? "Unable to load data." : json.error.message,
        );
      }

      setData(json.data);
      setError(null);
      hasLoadedRef.current = true;
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (!hasLoadedRef.current) {
        setError(error instanceof Error ? error.message : "Unable to load data.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [url]);

  useEffect(() => {
    if (!options?.initialData || options.revalidateOnMount) {
      void refresh();
    }

    if (!intervalMs) {
      return () => {
        abortRef.current?.abort();
      };
    }

    // Polling stays on the client and hits our local API routes, so the browser
    // never talks directly to third-party services or sees any server secrets.
    const intervalId = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [intervalMs, options?.initialData, options?.revalidateOnMount, refresh]);

  return { data, error, isLoading, isRefreshing, refresh };
}

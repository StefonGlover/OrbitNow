type CacheEntry<T> = {
  expiresAt: number;
  staleUntil: number;
  value?: T;
  inflight?: Promise<T>;
};

const globalCache = globalThis as typeof globalThis & {
  __orbitnowCache?: Map<string, CacheEntry<unknown>>;
};

const cacheStore = globalCache.__orbitnowCache ?? new Map<string, CacheEntry<unknown>>();
globalCache.__orbitnowCache = cacheStore;

export async function withServerCache<T>(
  key: string,
  input: {
    ttlMs: number;
    staleWhileErrorMs?: number;
    loader: () => Promise<T>;
  },
): Promise<T> {
  const now = Date.now();
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.inflight) {
    return existing.inflight;
  }

  const nextEntry: CacheEntry<T> = existing ?? {
    expiresAt: 0,
    staleUntil: 0,
  };

  nextEntry.inflight = input
    .loader()
    .then((value) => {
      nextEntry.value = value;
      nextEntry.expiresAt = Date.now() + input.ttlMs;
      nextEntry.staleUntil =
        nextEntry.expiresAt + (input.staleWhileErrorMs ?? 0);
      return value;
    })
    .catch((error) => {
      if (
        nextEntry.value !== undefined &&
        nextEntry.staleUntil > Date.now()
      ) {
        return nextEntry.value;
      }

      throw error;
    })
    .finally(() => {
      nextEntry.inflight = undefined;
      cacheStore.set(key, nextEntry);
    });

  cacheStore.set(key, nextEntry);
  return nextEntry.inflight;
}

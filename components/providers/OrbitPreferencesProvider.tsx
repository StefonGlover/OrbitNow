"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  areOrbitPreferencesEquivalent,
  createDefaultOrbitPreferences,
  mergeOrbitPreferences,
  normalizeOrbitNewsTopics,
  normalizeOrbitPreferences,
  OrbitDisplayPreferences,
  OrbitFavoriteObject,
  OrbitFavoriteObjectInput,
  OrbitHomeLocation,
  OrbitNewsTopic,
  OrbitPreferences,
  ORBIT_PREFERENCES_STORAGE_KEY,
} from "@/lib/orbit-preferences";
import type {
  OrbitAccountMutationResponse,
    ApiRouteResponse,
    OrbitAlertsAckApiResponse,
    OrbitAlertsPollApiResponse,
  OrbitAuthResponse,
  OrbitAuthSessionResponse,
  OrbitNotificationAlert,
  OrbitPreferencesSyncResponse,
  OrbitSessionUser,
} from "@/lib/types";

type OrbitSyncStatus = "local-only" | "syncing" | "synced" | "error";
type OrbitNotificationPermission = NotificationPermission | "unsupported";

type OrbitPreferencesContextValue = {
  preferences: OrbitPreferences;
  hydrated: boolean;
  sessionUser: OrbitSessionUser | null;
  isSessionLoading: boolean;
  authPending: boolean;
  syncStatus: OrbitSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  recentAlerts: OrbitNotificationAlert[];
  unreadAlertCount: number;
  notificationsSupported: boolean;
  notificationPermission: OrbitNotificationPermission;
  setHomeLocation: (location: OrbitHomeLocation | null) => void;
  saveFavoriteObject: (favorite: OrbitFavoriteObjectInput) => void;
  removeFavoriteObject: (favoriteId: string) => void;
  setNewsTopics: (topics: OrbitNewsTopic[]) => void;
  toggleNewsTopic: (topic: OrbitNewsTopic) => void;
  updateAlerts: (updates: Partial<OrbitPreferences["alerts"]>) => void;
  updateDisplay: (updates: Partial<OrbitDisplayPreferences>) => void;
  register: (input: { email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    nextPassword: string;
  }) => Promise<string>;
  deleteAccount: () => Promise<string>;
  syncNow: () => Promise<void>;
  requestNotificationPermission: () => Promise<OrbitNotificationPermission>;
  dismissAlert: (alertId: string) => void;
};

const OrbitPreferencesContext =
  createContext<OrbitPreferencesContextValue | null>(null);

function stampPreferences(
  updater: (current: OrbitPreferences) => OrbitPreferences,
) {
  return (current: OrbitPreferences) => ({
    ...updater(current),
    updatedAt: new Date().toISOString(),
  });
}

async function readApiData<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json()) as ApiRouteResponse<T>;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success ? "The request could not be completed." : json.error.message,
    );
  }

  return json.data;
}

async function acknowledgeAlertsOnServer(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  await readApiData<OrbitAlertsAckApiResponse>("/api/alerts/ack", {
    method: "POST",
    body: JSON.stringify({
      keys,
    }),
  });
}

function addAlertsToCollection(
  currentAlerts: OrbitNotificationAlert[],
  nextAlerts: OrbitNotificationAlert[],
) {
  const alertMap = new Map(
    currentAlerts.map((alert) => [alert.key, alert] as const),
  );

  for (const alert of nextAlerts) {
    alertMap.set(alert.key, alert);
  }

  return Array.from(alertMap.values())
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 8);
}

function isInternalOrbitUrl(value: string) {
  return value.startsWith("/");
}

export function OrbitPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<OrbitPreferences>(
    createDefaultOrbitPreferences(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [sessionUser, setSessionUser] = useState<OrbitSessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OrbitSyncStatus>("local-only");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<OrbitNotificationAlert[]>([]);
  const [notificationPermission, setNotificationPermission] =
    useState<OrbitNotificationPermission>("unsupported");
  const preferencesRef = useRef(preferences);
  const latestServerPreferencesRef = useRef<OrbitPreferences | null>(null);
  const pendingSyncRef = useRef<number | null>(null);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    try {
      const storedPreferences = window.localStorage.getItem(
        ORBIT_PREFERENCES_STORAGE_KEY,
      );

      if (storedPreferences) {
        setPreferences(normalizeOrbitPreferences(JSON.parse(storedPreferences)));
      }
    } catch {
      setPreferences(createDefaultOrbitPreferences());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    // My Orbit stays useful offline and before sign-in by persisting locally,
    // then the provider layers account sync on top when a session exists.
    window.localStorage.setItem(
      ORBIT_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  }, [hydrated, preferences]);

  useEffect(() => {
    document.documentElement.dataset.orbitTheme = preferences.display.themeMode;
  }, [preferences.display.themeMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(window.Notification.permission);
  }, []);

  const persistPreferencesToServer = useCallback(async (
    nextPreferences: OrbitPreferences,
  ) => {
    if (!sessionUser) {
      setSyncStatus("local-only");
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const payload = await readApiData<OrbitPreferencesSyncResponse>(
        "/api/preferences",
        {
          method: "PUT",
          body: JSON.stringify({
            preferences: nextPreferences,
          }),
        },
      );

      latestServerPreferencesRef.current = payload.preferences;
      setLastSyncedAt(payload.syncedAt);
      setSyncStatus("synced");

      if (!areOrbitPreferencesEquivalent(nextPreferences, payload.preferences)) {
        setPreferences(payload.preferences);
      }
    } catch (error) {
      setSyncStatus("error");
      setSyncError(
        error instanceof Error
          ? error.message
          : "OrbitNow could not sync your preferences.",
      );
      throw error;
    }
  }, [sessionUser]);

  const adoptRemoteProfile = useCallback(async (
    payload: Pick<OrbitAuthResponse, "user" | "preferences" | "syncedAt">,
  ) => {
    setSessionUser(payload.user);
    setSyncError(null);

    if (!payload.preferences) {
      latestServerPreferencesRef.current = null;
      setLastSyncedAt(payload.syncedAt);
      setSyncStatus("synced");
      return;
    }

    latestServerPreferencesRef.current = payload.preferences;
    setLastSyncedAt(payload.syncedAt);

    const mergedPreferences = mergeOrbitPreferences(
      preferencesRef.current,
      payload.preferences,
    );

    if (!areOrbitPreferencesEquivalent(preferencesRef.current, mergedPreferences)) {
      setPreferences(mergedPreferences);
    }

    if (!areOrbitPreferencesEquivalent(mergedPreferences, payload.preferences)) {
      await persistPreferencesToServer(mergedPreferences);
      return;
    }

    setSyncStatus("synced");
  }, [persistPreferencesToServer]);
  const adoptRemoteProfileRef = useRef(adoptRemoteProfile);
  const persistPreferencesToServerRef = useRef(persistPreferencesToServer);

  useEffect(() => {
    adoptRemoteProfileRef.current = adoptRemoteProfile;
  }, [adoptRemoteProfile]);

  useEffect(() => {
    persistPreferencesToServerRef.current = persistPreferencesToServer;
  }, [persistPreferencesToServer]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let isCancelled = false;

    async function bootstrapSession() {
      setIsSessionLoading(true);

      try {
        const session = await readApiData<OrbitAuthSessionResponse>(
          "/api/auth/session",
          {
            cache: "no-store",
          },
        );

        if (isCancelled) {
          return;
        }

        if (!session.authenticated || !session.user) {
          setSessionUser(null);
          setSyncStatus("local-only");
          setSyncError(null);
          setLastSyncedAt(null);
          latestServerPreferencesRef.current = null;
          return;
        }

        setSessionUser(session.user);
        setSyncStatus("syncing");

        const syncedPreferences = await readApiData<OrbitPreferencesSyncResponse>(
          "/api/preferences",
          {
            cache: "no-store",
          },
        );

        if (isCancelled) {
          return;
        }

        await adoptRemoteProfileRef.current({
          user: session.user,
          preferences: syncedPreferences.preferences,
          syncedAt: syncedPreferences.syncedAt,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSyncStatus("error");
        setSyncError(
          error instanceof Error
            ? error.message
            : "OrbitNow could not restore your session.",
        );
      } finally {
        if (!isCancelled) {
          setIsSessionLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !sessionUser || isSessionLoading) {
      return;
    }

    if (
      latestServerPreferencesRef.current &&
      areOrbitPreferencesEquivalent(
        preferences,
        latestServerPreferencesRef.current,
      )
    ) {
      return;
    }

    if (pendingSyncRef.current) {
      window.clearTimeout(pendingSyncRef.current);
    }

    pendingSyncRef.current = window.setTimeout(() => {
      void persistPreferencesToServerRef.current(preferencesRef.current);
    }, 900);

    return () => {
      if (pendingSyncRef.current) {
        window.clearTimeout(pendingSyncRef.current);
      }
    };
  }, [hydrated, isSessionLoading, preferences, sessionUser]);

  useEffect(() => {
    if (!sessionUser) {
      setRecentAlerts([]);
      return;
    }

    const hasActiveAlertPreference =
      preferences.alerts.issOverheadSoon ||
      preferences.alerts.launchReminders ||
      preferences.alerts.majorNewsAlerts ||
      preferences.alerts.nightlyPlannerDigest;

    if (!hasActiveAlertPreference) {
      return;
    }

    let isCancelled = false;

    async function pollAlerts() {
      try {
        const payload = await readApiData<OrbitAlertsPollApiResponse>(
          "/api/alerts/poll",
          {
            cache: "no-store",
          },
        );

        if (isCancelled || payload.alerts.length === 0) {
          return;
        }

        setRecentAlerts((currentAlerts) =>
          addAlertsToCollection(currentAlerts, payload.alerts),
        );

        void acknowledgeAlertsOnServer(payload.alerts.map((alert) => alert.key)).catch(
          () => {
            // If acknowledgment fails, the alerts can be safely retried on the next poll.
          },
        );

        if (notificationPermission !== "granted" || !("Notification" in window)) {
          return;
        }

        for (const alert of payload.alerts) {
          const notification = new window.Notification(alert.title, {
            body: alert.body,
            tag: alert.key,
          });

          notification.onclick = () => {
            if (alert.actionUrl) {
              if (isInternalOrbitUrl(alert.actionUrl)) {
                window.location.assign(alert.actionUrl);
              } else {
                window.open(alert.actionUrl, "_blank", "noopener,noreferrer");
              }
            } else {
              window.focus();
            }
          };
        }
      } catch {
        // Alert polling is intentionally resilient so a temporary upstream or
        // auth hiccup does not disrupt the rest of the dashboard experience.
      }
    }

    void pollAlerts();
    const intervalId = window.setInterval(() => {
      void pollAlerts();
    }, 300_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    notificationPermission,
    preferences.alerts.issOverheadSoon,
    preferences.alerts.launchReminders,
    preferences.alerts.majorNewsAlerts,
    preferences.alerts.nightlyPlannerDigest,
    preferences.homeLocation?.label,
    preferences.homeLocation?.latitude,
    preferences.homeLocation?.longitude,
    preferences.newsTopics,
    sessionUser,
  ]);

  const value: OrbitPreferencesContextValue = {
    preferences,
    hydrated,
    sessionUser,
    isSessionLoading,
    authPending,
    syncStatus,
    syncError,
    lastSyncedAt,
    recentAlerts,
    unreadAlertCount: recentAlerts.length,
    notificationsSupported: notificationPermission !== "unsupported",
    notificationPermission,
    setHomeLocation: (location) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          homeLocation: location,
        })),
      );
    },
    saveFavoriteObject: (favorite) => {
      setPreferences(
        stampPreferences((current) => {
          const nextFavorite: OrbitFavoriteObject = {
            ...favorite,
            savedAt: new Date().toISOString(),
          };

          return {
            ...current,
            favoriteObjects: [
              nextFavorite,
              ...current.favoriteObjects.filter(
                (existingFavorite) => existingFavorite.id !== favorite.id,
              ),
            ].slice(0, 10),
          };
        }),
      );
    },
    removeFavoriteObject: (favoriteId) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          favoriteObjects: current.favoriteObjects.filter(
            (favorite) => favorite.id !== favoriteId,
          ),
        })),
      );
    },
    setNewsTopics: (topics) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          newsTopics: normalizeOrbitNewsTopics(topics),
        })),
      );
    },
    toggleNewsTopic: (topic) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          newsTopics: current.newsTopics.includes(topic)
            ? current.newsTopics.filter((item) => item !== topic)
            : normalizeOrbitNewsTopics([...current.newsTopics, topic]),
        })),
      );
    },
    updateAlerts: (updates) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          alerts: {
            ...current.alerts,
            ...updates,
          },
        })),
      );
    },
    updateDisplay: (updates) => {
      setPreferences(
        stampPreferences((current) => ({
          ...current,
          display: {
            ...current.display,
            ...updates,
          },
        })),
      );
    },
    register: async ({ email, password }) => {
      setAuthPending(true);

      try {
        const payload = await readApiData<OrbitAuthResponse>(
          "/api/auth/register",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          },
        );

        await adoptRemoteProfile(payload);
      } finally {
        setAuthPending(false);
        setIsSessionLoading(false);
      }
    },
    login: async ({ email, password }) => {
      setAuthPending(true);

      try {
        const payload = await readApiData<OrbitAuthResponse>(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          },
        );

        await adoptRemoteProfile(payload);
      } finally {
        setAuthPending(false);
        setIsSessionLoading(false);
      }
    },
    logout: async () => {
      setAuthPending(true);

      try {
        await readApiData<OrbitAuthSessionResponse>("/api/auth/logout", {
          method: "POST",
        });
        setSessionUser(null);
        setRecentAlerts([]);
        setSyncError(null);
        setSyncStatus("local-only");
        setLastSyncedAt(null);
        latestServerPreferencesRef.current = null;
      } finally {
        setAuthPending(false);
      }
    },
    changePassword: async ({ currentPassword, nextPassword }) => {
      setAuthPending(true);

      try {
        const payload = await readApiData<OrbitAccountMutationResponse>(
          "/api/auth/change-password",
          {
            method: "POST",
            body: JSON.stringify({
              currentPassword,
              nextPassword,
            }),
          },
        );

        setSessionUser(null);
        setRecentAlerts([]);
        setSyncError(null);
        setSyncStatus("local-only");
        setLastSyncedAt(null);
        latestServerPreferencesRef.current = null;

        return payload.message;
      } finally {
        setAuthPending(false);
      }
    },
    deleteAccount: async () => {
      setAuthPending(true);

      try {
        const payload = await readApiData<OrbitAccountMutationResponse>(
          "/api/auth/delete-account",
          {
            method: "POST",
          },
        );

        setSessionUser(null);
        setRecentAlerts([]);
        setSyncError(null);
        setSyncStatus("local-only");
        setLastSyncedAt(null);
        latestServerPreferencesRef.current = null;
        setPreferences(createDefaultOrbitPreferences());
        window.localStorage.removeItem(ORBIT_PREFERENCES_STORAGE_KEY);

        return payload.message;
      } finally {
        setAuthPending(false);
      }
    },
    syncNow: async () => {
      if (pendingSyncRef.current) {
        window.clearTimeout(pendingSyncRef.current);
      }

      await persistPreferencesToServer(preferencesRef.current);
    },
    requestNotificationPermission: async () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        setNotificationPermission("unsupported");
        return "unsupported";
      }

      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    },
    dismissAlert: (alertId) => {
      setRecentAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert.id !== alertId),
      );
    },
  };

  return (
    <OrbitPreferencesContext.Provider value={value}>
      {children}
    </OrbitPreferencesContext.Provider>
  );
}

export function useOrbitPreferences() {
  const context = useContext(OrbitPreferencesContext);

  if (!context) {
    throw new Error(
      "useOrbitPreferences must be used within an OrbitPreferencesProvider.",
    );
  }

  return context;
}

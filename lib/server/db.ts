import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createDefaultOrbitPreferences, normalizeOrbitPreferences, type OrbitPreferences } from "@/lib/orbit-preferences";
import { conflictError } from "@/lib/server/api";
import type { OrbitSessionUser } from "@/lib/types";

type OrbitAlertLedger = {
  deliveredByKey: Record<string, string>;
};

type OrbitUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
  preferences: OrbitPreferences;
  alerts: OrbitAlertLedger;
};

type OrbitDatabase = {
  users: OrbitUserRecord[];
};

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIRECTORY, "orbitnow-db.json");

const globalDatabaseState = globalThis as typeof globalThis & {
  __orbitnowDbMutex?: {
    locked: boolean;
    waiters: Array<() => void>;
  };
};

const databaseMutex = globalDatabaseState.__orbitnowDbMutex ?? {
  locked: false,
  waiters: [] as Array<() => void>,
};
globalDatabaseState.__orbitnowDbMutex = databaseMutex;

function createEmptyDatabase(): OrbitDatabase {
  return {
    users: [],
  };
}

async function ensureDatabaseFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await readFile(DB_FILE_PATH, "utf8");
  } catch {
    await writeFile(DB_FILE_PATH, JSON.stringify(createEmptyDatabase(), null, 2), "utf8");
  }
}

async function acquireDatabaseLock() {
  if (!databaseMutex.locked) {
    databaseMutex.locked = true;

    return () => {
      const nextWaiter = databaseMutex.waiters.shift();

      if (nextWaiter) {
        nextWaiter();
        return;
      }

      databaseMutex.locked = false;
    };
  }

  await new Promise<void>((resolve) => {
    databaseMutex.waiters.push(() => {
      databaseMutex.locked = true;
      resolve();
    });
  });

  return () => {
    const nextWaiter = databaseMutex.waiters.shift();

    if (nextWaiter) {
      nextWaiter();
      return;
    }

    databaseMutex.locked = false;
  };
}

async function withDatabaseLock<T>(task: () => Promise<T>) {
  const releaseLock = await acquireDatabaseLock();

  try {
    return await task();
  } finally {
    releaseLock();
  }
}

function normalizeAlertLedger(value: unknown): OrbitAlertLedger {
  if (
    !value ||
    typeof value !== "object" ||
    !("deliveredByKey" in value) ||
    !value.deliveredByKey ||
    typeof value.deliveredByKey !== "object"
  ) {
    return {
      deliveredByKey: {},
    };
  }

  return {
    deliveredByKey: Object.fromEntries(
      Object.entries(value.deliveredByKey as Record<string, unknown>).filter(
        ([key, deliveredAt]) =>
          Boolean(key) && typeof deliveredAt === "string" && deliveredAt.trim().length > 0,
      ),
    ) as Record<string, string>,
  };
}

function normalizeUserRecord(value: unknown): OrbitUserRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as Partial<OrbitUserRecord>;

  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.passwordHash !== "string" ||
    typeof user.passwordSalt !== "string" ||
    typeof user.createdAt !== "string" ||
    typeof user.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: user.id,
    email: user.email.trim().toLowerCase(),
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
    sessionVersion:
      typeof user.sessionVersion === "number" && Number.isInteger(user.sessionVersion)
        ? user.sessionVersion
        : 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferences: normalizeOrbitPreferences(user.preferences),
    alerts: normalizeAlertLedger(user.alerts),
  };
}

async function readDatabase(): Promise<OrbitDatabase> {
  await ensureDatabaseFile();
  const raw = await readFile(DB_FILE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as OrbitDatabase;

    return {
      users: Array.isArray(parsed.users)
        ? parsed.users
            .map((user) => normalizeUserRecord(user))
            .filter((user): user is OrbitUserRecord => user !== null)
        : [],
    };
  } catch {
    return createEmptyDatabase();
  }
}

async function writeDatabase(database: OrbitDatabase) {
  await ensureDatabaseFile();
  const tempPath = `${DB_FILE_PATH}.${randomUUID()}.tmp`;

  await writeFile(tempPath, JSON.stringify(database, null, 2), "utf8");
  await rename(tempPath, DB_FILE_PATH);
}

function toSessionUser(user: OrbitUserRecord): OrbitSessionUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function findUserByEmail(email: string) {
  const database = await readDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  return database.users.find((user) => user.email === normalizedEmail) ?? null;
}

export async function findUserById(userId: string) {
  const database = await readDatabase();

  return database.users.find((user) => user.id === userId) ?? null;
}

export async function createUserRecord(input: {
  email: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const now = new Date().toISOString();
    const normalizedEmail = input.email.trim().toLowerCase();

    if (database.users.some((user) => user.email === normalizedEmail)) {
      throw conflictError("An account with that email already exists.");
    }

    const user: OrbitUserRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      sessionVersion: 1,
      createdAt: now,
      updatedAt: now,
      preferences: {
        ...createDefaultOrbitPreferences(),
        updatedAt: now,
      },
      alerts: {
        deliveredByKey: {},
      },
    };

    database.users.push(user);
    await writeDatabase(database);

    return user;
  });
}

export async function updateUserPreferences(userId: string, preferences: OrbitPreferences) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const user = database.users.find((item) => item.id === userId);

    if (!user) {
      return null;
    }

    const now = new Date().toISOString();
    user.preferences = {
      ...normalizeOrbitPreferences(preferences),
      updatedAt: now,
    };
    user.updatedAt = now;

    await writeDatabase(database);

    return user.preferences;
  });
}

export async function getUserPreferences(userId: string) {
  const user = await findUserById(userId);
  return user ? normalizeOrbitPreferences(user.preferences) : null;
}

export async function getUserAlertLedger(userId: string) {
  const user = await findUserById(userId);
  return user?.alerts ?? { deliveredByKey: {} };
}

export async function markDeliveredAlerts(userId: string, alertKeys: string[]) {
  if (alertKeys.length === 0) {
    return;
  }

  await withDatabaseLock(async () => {
    const database = await readDatabase();
    const user = database.users.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    const now = new Date().toISOString();

    for (const key of alertKeys) {
      user.alerts.deliveredByKey[key] = now;
    }

    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
    user.alerts.deliveredByKey = Object.fromEntries(
      Object.entries(user.alerts.deliveredByKey).filter(([, deliveredAt]) => {
        return new Date(deliveredAt).getTime() >= cutoff;
      }),
    );
    user.updatedAt = now;

    await writeDatabase(database);
  });
}

export async function rotateUserSessionVersion(userId: string) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const user = database.users.find((item) => item.id === userId);

    if (!user) {
      return null;
    }

    user.sessionVersion += 1;
    user.updatedAt = new Date().toISOString();

    await writeDatabase(database);

    return user;
  });
}

export function toClientSession(user: OrbitUserRecord | null): OrbitSessionUser | null {
  return user ? toSessionUser(user) : null;
}

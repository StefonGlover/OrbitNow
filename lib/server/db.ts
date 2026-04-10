import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createDefaultOrbitPreferences, normalizeOrbitPreferences, type OrbitPreferences } from "@/lib/orbit-preferences";
import type { OrbitSessionUser } from "@/lib/types";

type OrbitAlertLedger = {
  deliveredByKey: Record<string, string>;
};

type OrbitUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
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

async function readDatabase(): Promise<OrbitDatabase> {
  await ensureDatabaseFile();
  const raw = await readFile(DB_FILE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as OrbitDatabase;

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  } catch {
    return createEmptyDatabase();
  }
}

async function writeDatabase(database: OrbitDatabase) {
  await ensureDatabaseFile();
  const tempPath = `${DB_FILE_PATH}.tmp`;

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
  const database = await readDatabase();
  const now = new Date().toISOString();

  const user: OrbitUserRecord = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    createdAt: now,
    updatedAt: now,
    preferences: createDefaultOrbitPreferences(),
    alerts: {
      deliveredByKey: {},
    },
  };

  database.users.push(user);
  await writeDatabase(database);

  return user;
}

export async function updateUserPreferences(userId: string, preferences: OrbitPreferences) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  user.preferences = normalizeOrbitPreferences(preferences);
  user.updatedAt = new Date().toISOString();

  await writeDatabase(database);

  return user.preferences;
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
}

export function toClientSession(user: OrbitUserRecord | null): OrbitSessionUser | null {
  return user ? toSessionUser(user) : null;
}

import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import type { BindParams, Database, SqlJsStatic } from "sql.js";
import {
  createDefaultOrbitPreferences,
  normalizeOrbitPreferences,
  type OrbitPreferences,
} from "@/lib/orbit-preferences";
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
};

type LegacyOrbitUserRecord = OrbitUserRecord & {
  alerts?: OrbitAlertLedger;
};

type LegacyOrbitDatabase = {
  users?: LegacyOrbitUserRecord[];
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number | null;
};

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DEFAULT_DB_FILE_PATH = path.join(DATA_DIRECTORY, "orbitnow.sqlite");
const LEGACY_DB_FILE_PATH = path.join(DATA_DIRECTORY, "orbitnow-db.json");
const PASSWORD_RESET_WINDOW_MS = 1000 * 60 * 60;

const globalDatabaseState = globalThis as typeof globalThis & {
  __orbitnowDbMutex?: {
    locked: boolean;
    waiters: Array<() => void>;
  };
  __orbitnowSqlJs?: Promise<SqlJsStatic>;
  __orbitnowDatabase?: Database;
  __orbitnowDatabasePath?: string;
};

const databaseMutex = globalDatabaseState.__orbitnowDbMutex ?? {
  locked: false,
  waiters: [] as Array<() => void>,
};
globalDatabaseState.__orbitnowDbMutex = databaseMutex;

function getDatabaseFilePath() {
  return process.env.ORBITNOW_DB_PATH?.trim() || DEFAULT_DB_FILE_PATH;
}

async function ensureDataDirectory(filePath = getDatabaseFilePath()) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function createEmptyDatabase(): LegacyOrbitDatabase {
  return {
    users: [],
  };
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
          Boolean(key) &&
          typeof deliveredAt === "string" &&
          deliveredAt.trim().length > 0,
      ),
    ) as Record<string, string>,
  };
}

function normalizeLegacyUserRecord(value: unknown): LegacyOrbitUserRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as Partial<LegacyOrbitUserRecord>;

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

function normalizeLegacyDatabase(value: unknown): LegacyOrbitDatabase {
  if (!value || typeof value !== "object") {
    return createEmptyDatabase();
  }

  const parsed = value as LegacyOrbitDatabase;

  return {
    users: Array.isArray(parsed.users)
      ? parsed.users
          .map((user) => normalizeLegacyUserRecord(user))
          .filter((user): user is LegacyOrbitUserRecord => user !== null)
      : [],
  };
}

async function readLegacyDatabase() {
  try {
    const raw = await readFile(LEGACY_DB_FILE_PATH, "utf8");
    return normalizeLegacyDatabase(JSON.parse(raw));
  } catch {
    return createEmptyDatabase();
  }
}

async function loadSqlJsModule() {
  // Next can incorrectly prefer sql.js' browser export while bundling route handlers.
  // Import the Node-oriented dist entry directly so server routes never execute the browser build.
  const sqlJsModule = await import("sql.js/dist/sql-wasm.js");
  return sqlJsModule.default;
}

function createSqlJsPromise() {
  if (!globalDatabaseState.__orbitnowSqlJs) {
    globalDatabaseState.__orbitnowSqlJs = loadSqlJsModule().then((initSqlJs) =>
      initSqlJs({
        locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
      }),
    );
  }

  return globalDatabaseState.__orbitnowSqlJs;
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

function runQuery<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params?: BindParams,
) {
  const statement = db.prepare(sql);

  try {
    if (params) {
      statement.bind(params);
    }

    const rows: T[] = [];

    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }

    return rows;
  } finally {
    statement.free();
  }
}

function getFirstRow<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params?: BindParams,
) {
  const [row = null] = runQuery<T>(db, sql, params);
  return row;
}

function initializeSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      session_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      preferences_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_ledger (
      user_id TEXT NOT NULL,
      alert_key TEXT NOT NULL,
      delivered_at TEXT NOT NULL,
      PRIMARY KEY (user_id, alert_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      scope TEXT NOT NULL,
      identifier TEXT NOT NULL,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL,
      PRIMARY KEY (scope, identifier)
    );
  `);
}

function serializePreferences(preferences: OrbitPreferences) {
  return JSON.stringify(normalizeOrbitPreferences(preferences));
}

function mapUserRow(row: Record<string, unknown> | null): OrbitUserRecord | null {
  if (!row) {
    return null;
  }

  const rawPreferences =
    typeof row.preferences_json === "string" ? row.preferences_json : "{}";

  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? "").trim().toLowerCase(),
    passwordHash: String(row.password_hash ?? ""),
    passwordSalt: String(row.password_salt ?? ""),
    sessionVersion:
      typeof row.session_version === "number"
        ? row.session_version
        : Number(row.session_version ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    preferences: normalizeOrbitPreferences(JSON.parse(rawPreferences)),
  };
}

async function migrateLegacyJsonDatabaseIfNeeded(db: Database) {
  const userCountRow = getFirstRow<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM users",
  );

  if ((userCountRow?.count ?? 0) > 0) {
    return;
  }

  const legacyDatabase = await readLegacyDatabase();

  for (const legacyUser of legacyDatabase.users ?? []) {
    const normalizedPreferences = {
      ...normalizeOrbitPreferences(legacyUser.preferences),
      updatedAt: legacyUser.preferences.updatedAt || legacyUser.updatedAt,
    };

    db.run(
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          password_salt,
          session_version,
          created_at,
          updated_at,
          preferences_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        legacyUser.id,
        legacyUser.email.trim().toLowerCase(),
        legacyUser.passwordHash,
        legacyUser.passwordSalt,
        legacyUser.sessionVersion,
        legacyUser.createdAt,
        legacyUser.updatedAt,
        serializePreferences(normalizedPreferences),
      ],
    );

    for (const [alertKey, deliveredAt] of Object.entries(
      legacyUser.alerts?.deliveredByKey ?? {},
    )) {
      db.run(
        `
          INSERT OR REPLACE INTO alert_ledger (user_id, alert_key, delivered_at)
          VALUES (?, ?, ?)
        `,
        [legacyUser.id, alertKey, deliveredAt],
      );
    }
  }
}

async function loadDatabase() {
  const filePath = getDatabaseFilePath();
  const sqlJs = await createSqlJsPromise();

  if (
    globalDatabaseState.__orbitnowDatabase &&
    globalDatabaseState.__orbitnowDatabasePath === filePath
  ) {
    return {
      db: globalDatabaseState.__orbitnowDatabase,
      filePath,
    };
  }

  if (
    globalDatabaseState.__orbitnowDatabase &&
    globalDatabaseState.__orbitnowDatabasePath !== filePath
  ) {
    globalDatabaseState.__orbitnowDatabase.close();
    globalDatabaseState.__orbitnowDatabase = undefined;
    globalDatabaseState.__orbitnowDatabasePath = undefined;
  }

  await ensureDataDirectory(filePath);

  let db: Database;

  try {
    const fileBytes = await readFile(filePath);
    db = new sqlJs.Database(fileBytes);
  } catch {
    db = new sqlJs.Database();
  }

  initializeSchema(db);
  await migrateLegacyJsonDatabaseIfNeeded(db);

  globalDatabaseState.__orbitnowDatabase = db;
  globalDatabaseState.__orbitnowDatabasePath = filePath;

  return {
    db,
    filePath,
  };
}

async function saveDatabase(db: Database, filePath: string) {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const buffer = Buffer.from(db.export());

  await ensureDataDirectory(filePath);
  await writeFile(tempPath, buffer);
  await rename(tempPath, filePath);
}

async function withDatabase<T>(
  task: (input: { db: Database; filePath: string }) => Promise<T> | T,
  options?: {
    write?: boolean;
  },
) {
  const releaseLock = await acquireDatabaseLock();

  try {
    const database = await loadDatabase();
    const result = await task(database);

    if (options?.write) {
      await saveDatabase(database.db, database.filePath);
    }

    return result;
  } finally {
    releaseLock();
  }
}

function toSessionUser(user: OrbitUserRecord): OrbitSessionUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function findUserByEmail(email: string) {
  return withDatabase(({ db }) => {
    const row = getFirstRow(db, "SELECT * FROM users WHERE email = ? LIMIT 1", [
      email.trim().toLowerCase(),
    ]);

    return mapUserRow(row);
  });
}

export async function findUserById(userId: string) {
  return withDatabase(({ db }) => {
    const row = getFirstRow(db, "SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    return mapUserRow(row);
  });
}

export async function createUserRecord(input: {
  email: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  return withDatabase(
    ({ db }) => {
      const now = new Date().toISOString();
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingUser = getFirstRow(db, "SELECT id FROM users WHERE email = ? LIMIT 1", [
        normalizedEmail,
      ]);

      if (existingUser) {
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
      };

      db.run(
        `
          INSERT INTO users (
            id,
            email,
            password_hash,
            password_salt,
            session_version,
            created_at,
            updated_at,
            preferences_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.email,
          user.passwordHash,
          user.passwordSalt,
          user.sessionVersion,
          user.createdAt,
          user.updatedAt,
          serializePreferences(user.preferences),
        ],
      );

      return user;
    },
    { write: true },
  );
}

export async function updateUserPreferences(userId: string, preferences: OrbitPreferences) {
  return withDatabase(
    ({ db }) => {
      const user = findUserRow(db, userId);

      if (!user) {
        return null;
      }

      const now = new Date().toISOString();
      const nextPreferences = {
        ...normalizeOrbitPreferences(preferences),
        updatedAt: now,
      };

      db.run(
        `
          UPDATE users
          SET preferences_json = ?, updated_at = ?
          WHERE id = ?
        `,
        [serializePreferences(nextPreferences), now, userId],
      );

      return nextPreferences;
    },
    { write: true },
  );
}

export async function getUserPreferences(userId: string) {
  const user = await findUserById(userId);
  return user ? normalizeOrbitPreferences(user.preferences) : null;
}

export async function getUserAlertLedger(userId: string) {
  return withDatabase(({ db }) => {
    const rows = runQuery<{ alert_key: string; delivered_at: string }>(
      db,
      "SELECT alert_key, delivered_at FROM alert_ledger WHERE user_id = ?",
      [userId],
    );

    return {
      deliveredByKey: Object.fromEntries(
        rows.map((row) => [row.alert_key, row.delivered_at]),
      ),
    };
  });
}

export async function markDeliveredAlerts(userId: string, alertKeys: string[]) {
  if (alertKeys.length === 0) {
    return;
  }

  await withDatabase(
    ({ db }) => {
      const user = findUserRow(db, userId);

      if (!user) {
        return;
      }

      const now = new Date().toISOString();

      for (const alertKey of alertKeys) {
        db.run(
          `
            INSERT OR REPLACE INTO alert_ledger (user_id, alert_key, delivered_at)
            VALUES (?, ?, ?)
          `,
          [userId, alertKey, now],
        );
      }

      const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
      db.run(
        "DELETE FROM alert_ledger WHERE user_id = ? AND delivered_at < ?",
        [userId, cutoff],
      );
      db.run("UPDATE users SET updated_at = ? WHERE id = ?", [now, userId]);
    },
    { write: true },
  );
}

export async function rotateUserSessionVersion(userId: string) {
  return withDatabase(
    ({ db }) => {
      const user = findUserRow(db, userId);

      if (!user) {
        return null;
      }

      const nextVersion = user.sessionVersion + 1;
      const now = new Date().toISOString();

      db.run(
        "UPDATE users SET session_version = ?, updated_at = ? WHERE id = ?",
        [nextVersion, now, userId],
      );

      return {
        ...user,
        sessionVersion: nextVersion,
        updatedAt: now,
      };
    },
    { write: true },
  );
}

export async function updateUserPassword(input: {
  userId: string;
  passwordHash: string;
  passwordSalt: string;
  rotateSession?: boolean;
}) {
  return withDatabase(
    ({ db }) => {
      const user = findUserRow(db, input.userId);

      if (!user) {
        return null;
      }

      const nextSessionVersion = input.rotateSession === false
        ? user.sessionVersion
        : user.sessionVersion + 1;
      const now = new Date().toISOString();

      db.run(
        `
          UPDATE users
          SET password_hash = ?, password_salt = ?, session_version = ?, updated_at = ?
          WHERE id = ?
        `,
        [
          input.passwordHash,
          input.passwordSalt,
          nextSessionVersion,
          now,
          input.userId,
        ],
      );

      db.run(
        "DELETE FROM password_reset_tokens WHERE user_id = ?",
        [input.userId],
      );

      return {
        ...user,
        passwordHash: input.passwordHash,
        passwordSalt: input.passwordSalt,
        sessionVersion: nextSessionVersion,
        updatedAt: now,
      };
    },
    { write: true },
  );
}

export async function deleteUserRecord(userId: string) {
  return withDatabase(
    ({ db }) => {
      const user = findUserRow(db, userId);

      if (!user) {
        return false;
      }

      db.run("DELETE FROM users WHERE id = ?", [userId]);
      return true;
    },
    { write: true },
  );
}

export async function createPasswordResetToken(userId: string) {
  return withDatabase(
    ({ db }) => {
      const user = findUserRow(db, userId);

      if (!user) {
        return null;
      }

      const rawToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
      const tokenHash = hashToken(rawToken);
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS).toISOString();

      db.run("DELETE FROM password_reset_tokens WHERE user_id = ?", [userId]);
      db.run(
        `
          INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at, consumed_at)
          VALUES (?, ?, ?, ?, NULL)
        `,
        [tokenHash, userId, expiresAt, createdAt],
      );

      return {
        rawToken,
        expiresAt,
      };
    },
    { write: true },
  );
}

export async function consumePasswordResetToken(rawToken: string) {
  return withDatabase(
    ({ db }) => {
      const tokenHash = hashToken(rawToken);
      const row = getFirstRow<{
        token_hash: string;
        user_id: string;
        expires_at: string;
        consumed_at: string | null;
      }>(
        db,
        `
          SELECT token_hash, user_id, expires_at, consumed_at
          FROM password_reset_tokens
          WHERE token_hash = ?
          LIMIT 1
        `,
        [tokenHash],
      );

      if (!row) {
        return null;
      }

      if (row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
        db.run("DELETE FROM password_reset_tokens WHERE token_hash = ?", [tokenHash]);
        return null;
      }

      db.run(
        "UPDATE password_reset_tokens SET consumed_at = ? WHERE token_hash = ?",
        [new Date().toISOString(), tokenHash],
      );

      return row.user_id;
    },
    { write: true },
  );
}

export async function consumeRateLimitBucket(input: {
  scope: string;
  identifier: string;
  maxRequests: number;
  windowMs: number;
}) {
  return withDatabase(
    ({ db }) => {
      const now = Date.now();

      db.run("DELETE FROM rate_limit_buckets WHERE reset_at <= ?", [now]);

      const row = getFirstRow<{ count: number; reset_at: number }>(
        db,
        `
          SELECT count, reset_at
          FROM rate_limit_buckets
          WHERE scope = ? AND identifier = ?
          LIMIT 1
        `,
        [input.scope, input.identifier],
      );

      if (!row) {
        db.run(
          `
            INSERT INTO rate_limit_buckets (scope, identifier, count, reset_at)
            VALUES (?, ?, ?, ?)
          `,
          [input.scope, input.identifier, 1, now + input.windowMs],
        );

        return {
          allowed: true,
          retryAfterSeconds: null,
        } satisfies RateLimitResult;
      }

      if (row.count >= input.maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
        } satisfies RateLimitResult;
      }

      db.run(
        `
          UPDATE rate_limit_buckets
          SET count = ?, reset_at = ?
          WHERE scope = ? AND identifier = ?
        `,
        [row.count + 1, row.reset_at, input.scope, input.identifier],
      );

      return {
        allowed: true,
        retryAfterSeconds: null,
      } satisfies RateLimitResult;
    },
    { write: true },
  );
}

function findUserRow(db: Database, userId: string) {
  return mapUserRow(getFirstRow(db, "SELECT * FROM users WHERE id = ? LIMIT 1", [userId]));
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function toClientSession(user: OrbitUserRecord | null): OrbitSessionUser | null {
  return user ? toSessionUser(user) : null;
}

export async function resetDatabaseForTests() {
  const filePath = getDatabaseFilePath();

  if (globalDatabaseState.__orbitnowDatabase) {
    globalDatabaseState.__orbitnowDatabase.close();
  }

  globalDatabaseState.__orbitnowDatabase = undefined;
  globalDatabaseState.__orbitnowDatabasePath = undefined;

  try {
    await rm(filePath);
  } catch {
    // Test cleanup should stay best-effort.
  }
}

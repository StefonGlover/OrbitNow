import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { badRequest, serverConfigError } from "@/lib/server/api";
import { findUserByEmail, findUserById, toClientSession } from "@/lib/server/db";
import type { OrbitSessionUser } from "@/lib/types";

const SESSION_COOKIE_NAME = "orbitnow_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  userId: string;
  version: number;
  exp: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSessionSecret() {
  const configuredSecret = process.env.ORBITNOW_SESSION_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "orbitnow-dev-session-secret-change-me";
  }

  throw serverConfigError("ORBITNOW_SESSION_SECRET is not configured on the server.");
}

export function assertSessionSecretConfigured() {
  void getSessionSecret();
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(password, salt, 64).toString("hex");

  return {
    salt,
    hash: derivedKey,
  };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const derivedKey = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const originalKey = Buffer.from(hash, "hex");

  if (derivedKey.length !== originalKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, originalKey);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(input: {
  userId: string;
  version: number;
}) {
  const payload: SessionPayload = {
    userId: input.userId,
    version: input.version,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  try {
    if (
      !timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(expectedSignature, "utf8"),
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.userId || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function applySessionCookie(
  response: NextResponse,
  input: {
    userId: string;
    version: number;
  },
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(input),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return response;
}

export async function getSessionUserFromRequest(request?: NextRequest): Promise<OrbitSessionUser | null> {
  const cookieStore = request ? request.cookies : cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    return null;
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    return null;
  }

  const tokenVersion = typeof payload.version === "number" ? payload.version : 0;

  if (tokenVersion !== user.sessionVersion) {
    return null;
  }

  return toClientSession(user);
}

export function validateCredentialInput(input: {
  email?: string;
  password?: string;
}) {
  const email = validateEmailAddress(input.email);
  const password = input.password ?? "";

  if (password.length < 8) {
    throw badRequest("Password must be at least 8 characters long.");
  }

  return {
    email,
    password,
  };
}

export function validateEmailAddress(value: string | undefined) {
  const email = value?.trim().toLowerCase() ?? "";

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw badRequest("Enter a valid email address.");
  }

  return email;
}

export function validatePasswordChangeInput(input: {
  currentPassword?: string;
  nextPassword?: string;
}) {
  const currentPassword = input.currentPassword ?? "";
  const nextPassword = input.nextPassword ?? "";

  if (currentPassword.length < 8) {
    throw badRequest("Current password is required.");
  }

  if (nextPassword.length < 8) {
    throw badRequest("New password must be at least 8 characters long.");
  }

  if (currentPassword === nextPassword) {
    throw badRequest("Choose a new password that is different from the current password.");
  }

  return {
    currentPassword,
    nextPassword,
  };
}

export function validateResetPasswordInput(input: {
  token?: string;
  password?: string;
}) {
  const token = input.token?.trim() ?? "";
  const password = input.password ?? "";

  if (token.length < 24) {
    throw badRequest("Reset token is invalid or missing.");
  }

  if (password.length < 8) {
    throw badRequest("Password must be at least 8 characters long.");
  }

  return {
    token,
    password,
  };
}

export async function authenticateUserRecord(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    throw badRequest("Email or password is incorrect.");
  }

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await authenticateUserRecord(email, password);
  return toClientSession(user);
}

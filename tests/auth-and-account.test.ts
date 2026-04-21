import os from "os";
import path from "path";
import { mkdtemp } from "fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as forgotPasswordRoute } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordRoute } from "@/app/api/auth/reset-password/route";
import {
  createSessionToken,
  hashPassword,
  validateCredentialInput,
  validatePasswordChangeInput,
  validateResetPasswordInput,
  verifyPassword,
  verifySessionToken,
} from "@/lib/server/auth";
import {
  createUserRecord,
  findUserByEmail,
  resetDatabaseForTests,
  updateUserPassword,
} from "@/lib/server/db";

describe("auth and account flows", () => {
  beforeEach(async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "orbitnow-auth-"));
    process.env.ORBITNOW_DB_PATH = path.join(tempDirectory, "orbitnow.sqlite");
    process.env.ORBITNOW_SESSION_SECRET = "test-session-secret";
    await resetDatabaseForTests();
  });

  afterEach(async () => {
    await resetDatabaseForTests();
    delete process.env.ORBITNOW_DB_PATH;
    delete process.env.ORBITNOW_SESSION_SECRET;
  });

  it("validates credentials and reset inputs", () => {
    expect(() =>
      validateCredentialInput({
        email: "not-an-email",
        password: "password123",
      }),
    ).toThrowError(/valid email/i);

    expect(() =>
      validatePasswordChangeInput({
        currentPassword: "password123",
        nextPassword: "password123",
      }),
    ).toThrowError(/different from the current password/i);

    expect(() =>
      validateResetPasswordInput({
        token: "short",
        password: "password123",
      }),
    ).toThrowError(/invalid or missing/i);
  });

  it("creates and verifies signed session tokens", () => {
    const token = createSessionToken({
      userId: "user-123",
      version: 3,
    });
    const payload = verifySessionToken(token);

    expect(payload).toMatchObject({
      userId: "user-123",
      version: 3,
    });
  });

  it("registers, logs in, and resets a password through the auth routes", async () => {
    const registerResponse = await registerRoute(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
          password: "password123",
        }),
      }),
    );
    const registerJson = await registerResponse.json();

    expect(registerResponse.status).toBe(200);
    expect(registerJson.success).toBe(true);
    expect(registerJson.data.authenticated).toBe(true);

    const forgotResponse = await forgotPasswordRoute(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
        }),
      }),
    );
    const forgotJson = await forgotResponse.json();

    expect(forgotResponse.status).toBe(200);
    expect(forgotJson.success).toBe(true);
    expect(forgotJson.data.resetToken).toBeTruthy();

    const resetResponse = await resetPasswordRoute(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: forgotJson.data.resetToken,
          password: "new-password123",
        }),
      }),
    );
    const resetJson = await resetResponse.json();

    expect(resetResponse.status).toBe(200);
    expect(resetJson.success).toBe(true);

    const loginResponse = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
          password: "new-password123",
        }),
      }),
    );
    const loginJson = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginJson.success).toBe(true);
    expect(loginJson.data.authenticated).toBe(true);
  });

  it("updates stored passwords safely", async () => {
    const originalPassword = hashPassword("password123");
    const createdUser = await createUserRecord({
      email: "owner@example.com",
      passwordHash: originalPassword.hash,
      passwordSalt: originalPassword.salt,
    });
    const nextPassword = hashPassword("next-password123");

    const updatedUser = await updateUserPassword({
      userId: createdUser.id,
      passwordHash: nextPassword.hash,
      passwordSalt: nextPassword.salt,
    });
    const persistedUser = await findUserByEmail("owner@example.com");

    expect(updatedUser?.sessionVersion).toBe(createdUser.sessionVersion + 1);
    expect(persistedUser).not.toBeNull();
    expect(
      verifyPassword(
        "next-password123",
        persistedUser!.passwordHash,
        persistedUser!.passwordSalt,
      ),
    ).toBe(true);
  });
});

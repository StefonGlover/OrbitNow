import os from "os";
import path from "path";
import { mkdtemp } from "fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { resetDatabaseForTests } from "@/lib/server/db";

describe("rate limiting", () => {
  beforeEach(async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "orbitnow-rate-limit-"));
    process.env.ORBITNOW_DB_PATH = path.join(tempDirectory, "orbitnow.sqlite");
    await resetDatabaseForTests();
  });

  afterEach(async () => {
    await resetDatabaseForTests();
    delete process.env.ORBITNOW_DB_PATH;
  });

  it("blocks repeated requests after the configured limit", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "OrbitNow test agent",
      },
    });

    await enforceRateLimit(request, {
      scope: "test-scope",
      maxRequests: 2,
      windowMs: 60_000,
      message: "Too many requests.",
    });
    await enforceRateLimit(request, {
      scope: "test-scope",
      maxRequests: 2,
      windowMs: 60_000,
      message: "Too many requests.",
    });

    await expect(
      enforceRateLimit(request, {
        scope: "test-scope",
        maxRequests: 2,
        windowMs: 60_000,
        message: "Too many requests.",
      }),
    ).rejects.toMatchObject({
      status: 429,
      code: "TOO_MANY_REQUESTS",
    });
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seam: POST /api/listings.
 * Pilot writes must fail closed when Neon Auth has not been configured, rather
 * than silently reverting to the unauthenticated JSON-demo behavior.
 */
describe("pilot write authentication guard", () => {
  const originalEnv = { ...process.env };
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-pilot-auth-"));
    setDataDir(tmpDir);
    process.env.BRANDARMOR_RUNTIME_MODE = "pilot";
    delete process.env.NEON_AUTH_BASE_URL;
    delete process.env.NEON_AUTH_COOKIE_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails closed before accepting an unauthenticated listing write", async () => {
    const route = await import("../src/app/api/listings/route");
    const response = await route.POST(new Request("http://localhost/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Pilot listing",
        observedAt: "2026-07-24T00:00:00.000Z",
        sourceType: "manual",
      }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "pilot_auth_not_configured",
    });
  });
});

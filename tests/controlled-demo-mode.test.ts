import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seams: GET /api/listings and mutation routes.
 * Independent policy: a hosted controlled demo remains viewable but must reject
 * new data, review changes, and paid-provider starts with one stable response.
 */
describe("controlled demo mode", () => {
  let tmpDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-controlled-demo-"));
    setDataDir(tmpDir);
    process.env.BRANDARMOR_RUNTIME_MODE = "controlled_demo";
    process.env.BRANDARMOR_AUTO_SEED = "1";
    process.env.BPOM_DISABLE_API = "1";
    delete process.env.MISTRAL_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("keeps seeded evidence readable while blocking demo, listing, and judge mutations", async () => {
    const listingsRoute = await import("../src/app/api/listings/route");
    const demoRoute = await import("../src/app/api/demo/run/route");
    const judgeRoute = await import("../src/app/api/judge/route");

    const listResponse = await listingsRoute.GET(new Request("http://localhost/api/listings"));
    const listingCreateResponse = await listingsRoute.POST(new Request("http://localhost/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New visitor listing",
        observedAt: "2026-07-24T00:00:00.000Z",
        sourceType: "manual",
      }),
    }));
    const demoResponse = await demoRoute.POST();
    const judgeResponse = await judgeRoute.POST(new Request("http://localhost/api/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "seed0000000060" }),
    }));

    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).length).toBeGreaterThan(0);

    for (const response of [listingCreateResponse, demoResponse, judgeResponse]) {
      expect(response.status).toBe(423);
      await expect(response.json()).resolves.toMatchObject({
        code: "controlled_demo_read_only",
        error: "This hosted workspace is in controlled demo mode.",
      });
    }
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

const originalEnv = { ...process.env };

describe("seeded demo read routes", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-seeded-read-"));
    setDataDir(tmpDir);
    process.env.BRANDARMOR_AUTO_SEED = "1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("seeds status, readiness, listing, and deep-report reads before reading the store", async () => {
    const statusRoute = await import("../src/app/api/status/route");
    const readinessRoute = await import("../src/app/api/health/demo-readiness/route");
    const listingsRoute = await import("../src/app/api/listings/route");
    const reportRoute = await import("../src/app/api/listings/[id]/report/route");

    const statusResponse = await statusRoute.GET();
    const readinessResponse = await readinessRoute.GET();
    const listingsResponse = await listingsRoute.GET(new Request("http://localhost/api/listings"));
    const reportResponse = await reportRoute.GET(
      new Request("http://localhost/api/listings/seed0000000060/report?format=json"),
      { params: Promise.resolve({ id: "seed0000000060" }) },
    );

    expect((await statusResponse.json()).listingCount).toBeGreaterThan(0);
    expect((await readinessResponse.json()).demoReady).toBe(true);
    expect((await listingsResponse.json()).some((listing: { id: string }) => listing.id === "seed0000000060")).toBe(true);
    expect(reportResponse.status).toBe(200);
  });

  it("seeds Brands before rendering its initial server data", async () => {
    const brandsPage = await import("../src/app/brands/page");
    const element = brandsPage.default() as unknown as { props: { initialBrands: unknown[] } };

    expect(element.props.initialBrands.length).toBeGreaterThan(0);
  });
});

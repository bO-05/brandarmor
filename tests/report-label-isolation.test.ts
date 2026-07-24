import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seam: GET /api/listings/[id]/report?format=json
 * Independent contract: evaluation labels are never operational evidence and
 * never appear in a reviewer-facing report, including legacy contaminated data.
 */
describe("GET /api/listings/[id]/report label isolation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-report-label-isolation-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not persist or expose a submitted evaluation label in the evidence report", async () => {
    const listingsRoute = await import("../src/app/api/listings/route");
    const createResponse = await listingsRoute.POST(new Request("http://localhost/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unreviewed marketplace listing",
        price: 49000,
        observedAt: "2026-07-24T00:00:00.000Z",
        sourceType: "manual",
        groundTruth: "counterfeit",
      }),
    }));
    const listing = await createResponse.json();

    const reportRoute = await import("../src/app/api/listings/[id]/report/route");
    const reportResponse = await reportRoute.GET(
      new Request(`http://localhost/api/listings/${listing.id}/report?format=json`),
      { params: Promise.resolve({ id: listing.id }) },
    );
    const reportText = await reportResponse.text();

    expect(createResponse.status).toBe(201);
    expect(reportResponse.status).toBe(200);
    expect(reportText).not.toContain("groundTruth");
    expect(reportText).not.toContain("\"extractedValue\":\"counterfeit\"");
  });
});

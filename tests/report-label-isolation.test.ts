import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createListing, resetDataDir, setDataDir } from "../src/persistence/store";
import { insertListingSchema } from "../src/domain/schemas";

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
    const parsed = insertListingSchema.parse({
      title: "Unreviewed marketplace listing",
      price: 49000,
      observedAt: "2026-07-24T00:00:00.000Z",
      sourceType: "manual",
      groundTruth: "counterfeit",
    });
    const listing = createListing(parsed);

    const reportRoute = await import("../src/app/api/listings/[id]/report/route");
    const reportResponse = await reportRoute.GET(
      new Request(`http://localhost/api/listings/${listing.id}/report?format=json`),
      { params: Promise.resolve({ id: listing.id }) },
    );
    const reportText = await reportResponse.text();

    expect("groundTruth" in parsed).toBe(false);
    expect(reportResponse.status).toBe(200);
    expect(reportText).not.toContain("groundTruth");
    expect(reportText).not.toContain("\"extractedValue\":\"counterfeit\"");
  });

  it("removes legacy evaluation-label fields when reading an existing evidence report", async () => {
    const listingId = "legacy-listing";
    const createdAt = "2026-07-24T00:00:00.000Z";
    fs.writeFileSync(path.join(tmpDir, "listings.json"), JSON.stringify([{
      id: listingId,
      productId: null,
      title: "Legacy marketplace listing",
      description: null,
      price: 49000,
      currency: "IDR",
      sellerName: null,
      marketplace: null,
      listingUrl: null,
      imageUrls: [],
      screenshotUrl: null,
      sourceConfidence: 0.6,
      rightsStatus: "unknown",
      limitations: [],
      groundTruth: "counterfeit",
      observedAt: createdAt,
      rawSource: null,
      sourceType: "manual",
      ocrStatus: "not_requested",
      ocrRequestedAt: null,
      ocrCompletedAt: null,
      createdAt,
    }]));
    fs.writeFileSync(path.join(tmpDir, "evidence.json"), JSON.stringify([{
      id: "legacy-evidence",
      listingId,
      evidenceType: "label",
      fieldName: "ground truth",
      extractedValue: "counterfeit",
      rawValue: "counterfeit",
      confidence: 1,
      notes: null,
      createdAt,
    }]));

    const reportRoute = await import("../src/app/api/listings/[id]/report/route");
    const response = await reportRoute.GET(
      new Request(`http://localhost/api/listings/${listingId}/report?format=json`),
      { params: Promise.resolve({ id: listingId }) },
    );
    const reportText = await response.text();

    expect(response.status).toBe(200);
    expect(reportText).not.toContain("groundTruth");
    expect(reportText).not.toContain("ground truth");
    expect(reportText).not.toContain("\"extractedValue\":\"counterfeit\"");
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createListing, createScore, resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seam: GET /api/listings/[id]/report?format=json.
 * Independent contract: reviewer reports keep routing risk, evidence coverage,
 * and confidence as distinct values instead of implying that missing proof is risk.
 */
describe("GET /api/listings/[id]/report score semantics", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-report-score-semantics-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("exports separate risk, evidence completeness, and confidence values", async () => {
    const listing = createListing({
      title: "Official listing with no image evidence",
      price: 159000,
      sellerName: "Official Store",
      observedAt: "2026-07-24T00:00:00.000Z",
      sourceType: "manual",
    });
    createScore({
      listingId: listing.id,
      totalScore: 0,
      riskScore: 0,
      evidenceCompleteness: 0.5,
      confidence: "medium",
      ruleScore: 0,
      calibratedScore: 0,
      confidenceBand: "directional",
      riskLevel: "low",
      recommendedAction: "ignore",
      reasons: [],
      features: {
        ruleScore: 0,
        ocrSuspiciousTermCount: 0,
        priceAnomalyRatio: null,
        sellerAuthorized: true,
        sourceConfidence: 0.8,
        imageSimilarityScore: null,
        regulatoryStatus: null,
        bpomNieMatch: null,
        packagingFieldMismatchCount: 0,
        ocrConfidence: null,
        evidenceCompleteness: 0.5,
      },
      scoringVersion: "2.1.0-v5-risk-confidence",
      triggeredRuleIds: [],
    });

    const route = await import("../src/app/api/listings/[id]/report/route");
    const response = await route.GET(
      new Request(`http://localhost/api/listings/${listing.id}/report?format=json`),
      { params: Promise.resolve({ id: listing.id }) },
    );
    const report = await response.json();

    expect(response.status).toBe(200);
    expect(report.score).toMatchObject({
      riskScore: 0,
      evidenceCompleteness: 0.5,
      confidence: "medium",
      riskLevel: "low",
    });
  });
});

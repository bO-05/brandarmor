import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createBrand,
  createEvaluationCase,
  createListing,
  createProduct,
  createReviewDecision,
  createScore,
  resetDataDir,
  setDataDir,
} from "../src/persistence/store";

describe("GET /api/status", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-status-route-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns consolidated ambient status counts", async () => {
    const brand = createBrand({ name: "Somethinc", description: null, websiteUrl: null, logoUrl: null });
    const product = createProduct({
      brandId: brand.id,
      name: "Calm Down Toner",
      sku: null,
      msrp: 159000,
      msrpCurrency: "IDR",
      msrpMin: null,
      msrpMax: null,
      description: null,
      officialUrls: [],
      officialImageUrls: [],
      requiredKeywords: [],
      suspiciousTerms: [],
      counterfeitTerms: [],
      authorizedSellers: [],
      packagingNotes: null,
      labelNotes: null,
      referenceImageNotes: null,
      category: "skincare_cosmetics",
      variant: null,
      sizeLabel: null,
      bpomNie: null,
      ingredientsHighlights: [],
      packagingClaims: [],
    });
    const linked = createListing({ productId: product.id, title: "Linked listing", observedAt: "2026-05-24T00:00:00.000Z", sourceType: "manual" });
    createListing({ productId: null, title: "Unlinked listing", observedAt: "2026-05-24T00:00:00.000Z", sourceType: "manual" });
    const score = createScore({
      listingId: linked.id,
      totalScore: 80,
      ruleScore: 80,
      calibratedScore: 80,
      confidenceBand: "directional",
      riskLevel: "high",
      recommendedAction: "review",
      reasons: [],
      features: {
        ruleScore: 80,
        ocrSuspiciousTermCount: 0,
        priceAnomalyRatio: null,
        sellerAuthorized: null,
        sourceConfidence: 0.8,
        imageSimilarityScore: null,
        regulatoryStatus: null,
        bpomNieMatch: null,
        packagingFieldMismatchCount: 0,
        ocrConfidence: null,
        evidenceCompleteness: 0.5,
      },
      scoringVersion: "test",
      triggeredRuleIds: [],
    });
    createReviewDecision({ listingId: linked.id, scoreId: score.id, status: "pending" });
    createEvaluationCase({ title: "Fixture", price: 100000, groundTruth: "likely_counterfeit" });

    const route = await import("../src/app/api/status/route");
    const response = await route.GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      listingCount: 2,
      unlinkedListingCount: 1,
      unscoredListingCount: 1,
      pendingReviewCount: 1,
      highRiskScoreCount: 1,
      evaluationCaseCount: 1,
      reviewDecisionCount: 1,
    });
  });
});

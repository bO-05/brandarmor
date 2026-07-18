import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBrand,
  createListing,
  createProduct,
  createReviewDecision,
  createScore,
  resetDataDir,
  setDataDir,
} from "../src/persistence/store";
import { summarizeReviewQueue } from "../src/lib/ui-ux";

const originalEnv = { ...process.env };

function scoreInput(listingId: string) {
  return {
    listingId,
    totalScore: 80,
    ruleScore: 80,
    calibratedScore: 80,
    confidenceBand: "directional" as const,
    riskLevel: "high" as const,
    recommendedAction: "review" as const,
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
  };
}

describe("review queue API freshness", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-review-route-"));
    setDataDir(tmpDir);
    process.env.BRANDARMOR_AUTO_SEED = "0";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns fresh queue data after a label is saved", async () => {
    const brand = createBrand({ name: "Example", description: null, websiteUrl: null, logoUrl: null });
    const product = createProduct({
      brandId: brand.id,
      name: "Example product",
      msrp: 100000,
      msrpCurrency: "IDR",
      officialUrls: [],
      officialImageUrls: [],
      requiredKeywords: [],
      suspiciousTerms: [],
      counterfeitTerms: [],
      authorizedSellers: [],
      category: "skincare_cosmetics",
      ingredientsHighlights: [],
      packagingClaims: [],
    });
    const listing = createListing({ productId: product.id, title: "Example candidate", observedAt: "2026-07-18T00:00:00.000Z", sourceType: "manual" });
    const score = createScore(scoreInput(listing.id));
    createReviewDecision({ listingId: listing.id, scoreId: score.id, status: "pending" });
    const route = await import("../src/app/api/review/route");

    const patch = await route.PATCH(new Request("http://localhost/api/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, status: "rejected_legitimate" }),
    }));
    const list = await route.GET(new Request("http://localhost/api/review"));
    const decisions = await list.json();
    const summary = summarizeReviewQueue(decisions.map((decision: { status: "pending" | "rejected_legitimate" }) => decision.status));

    expect(patch.status).toBe(200);
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect(summary).toMatchObject({ total: 1, pending: 0, labeled: 1 });
  });
});

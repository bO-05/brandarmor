import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBrand,
  createEvidence,
  createListing,
  createProduct,
  createScore,
  resetDataDir,
  setDataDir,
} from "../src/persistence/store";

describe("GET /api/listings/[id]/report", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-report-route-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("downloads a validated JSON evidence report with claim boundaries", async () => {
    const brand = createBrand({ name: "Example brand", description: null, websiteUrl: null, logoUrl: null });
    const product = createProduct({
      brandId: brand.id,
      name: "Example serum",
      msrp: 100000,
      msrpCurrency: "IDR",
      officialUrls: ["https://example.com/official"],
      officialImageUrls: [],
      requiredKeywords: [],
      suspiciousTerms: [],
      counterfeitTerms: [],
      authorizedSellers: [],
      category: "skincare_cosmetics",
      ingredientsHighlights: [],
      packagingClaims: [],
    });
    const listing = createListing({
      productId: product.id,
      title: "Example serum murah",
      price: 29000,
      observedAt: "2026-07-17T00:00:00.000Z",
      sourceType: "manual",
    });
    const evidence = createEvidence({
      listingId: listing.id,
      evidenceType: "numeric",
      fieldName: "price",
      extractedValue: "29000",
      confidence: 1,
    });
    createScore({
      listingId: listing.id,
      totalScore: 70,
      ruleScore: 70,
      calibratedScore: 70,
      confidenceBand: "directional",
      riskLevel: "high",
      recommendedAction: "review",
      reasons: [{ ruleId: "PRICE_ANOMALY", ruleName: "Price anomaly", message: "Below baseline.", points: 25, evidenceRefs: [evidence.id] }],
      features: {
        ruleScore: 70,
        ocrSuspiciousTermCount: 0,
        priceAnomalyRatio: 0.71,
        sellerAuthorized: false,
        sourceConfidence: 0.6,
        imageSimilarityScore: null,
        regulatoryStatus: null,
        bpomNieMatch: null,
        packagingFieldMismatchCount: 0,
        ocrConfidence: null,
        evidenceCompleteness: 0.4,
      },
      scoringVersion: "test",
      triggeredRuleIds: ["PRICE_ANOMALY"],
    });

    const route = await import("../src/app/api/listings/[id]/report/route");
    const response = await route.GET(new Request(`http://localhost/api/listings/${listing.id}/report?format=json`), {
      params: Promise.resolve({ id: listing.id }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("brandarmor-evidence-report");
    expect(json.listing.id).toBe(listing.id);
    expect(json.evidence.some((item: { id: string }) => item.id === evidence.id)).toBe(true);
    expect(json.disclaimer).toContain("not a legal determination");
    expect(json.privacy.excludedData).toContain("credentials");

    const pdfResponse = await route.GET(new Request(`http://localhost/api/listings/${listing.id}/report?format=pdf`), {
      params: Promise.resolve({ id: listing.id }),
    });
    const pdfPrefix = new TextDecoder().decode((await pdfResponse.arrayBuffer()).slice(0, 4));

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toContain("application/pdf");
    expect(pdfPrefix).toBe("%PDF");
  });
});

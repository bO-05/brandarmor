import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBrand,
  createListing,
  createProduct,
  getEvidence,
  getLlmJudgeAssessments,
  getRegulatoryChecks,
  getVisualMatches,
  resetDataDir,
  setDataDir,
} from "../src/persistence/store";

describe("POST /api/assessments/run", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-assessment-route-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("upserts generated artifacts and evidence when the same assessment is retried", async () => {
    const brand = createBrand({ name: "Example brand", description: null, websiteUrl: null, logoUrl: null });
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
    const listing = createListing({
      productId: product.id,
      title: "Example product murah",
      price: 20000,
      observedAt: "2026-07-17T00:00:00.000Z",
      sourceType: "manual",
    });
    const route = await import("../src/app/api/assessments/run/route");
    const request = () => new Request("http://localhost/api/assessments/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, forceMockJudge: true }),
    });

    const first = await route.POST(request());
    const second = await route.POST(request());
    const generatedEvidence = getEvidence(listing.id)
      .filter((entry) => ["regulatory_status", "visual_similarity"].includes(entry.fieldName));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(getRegulatoryChecks(listing.id)).toHaveLength(1);
    expect(getVisualMatches(listing.id)).toHaveLength(1);
    expect(getLlmJudgeAssessments(listing.id)).toHaveLength(1);
    expect(generatedEvidence).toHaveLength(2);
  });
});

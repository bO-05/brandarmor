import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seam: POST /api/scoring.
 * Independent policy: absent OCR, image, and regulatory evidence lowers
 * confidence/completeness but is never an adverse-risk reason on its own.
 */
describe("POST /api/scoring score semantics", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-score-semantics-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("keeps a clean listing low risk while reporting incomplete evidence separately", async () => {
    const brandsRoute = await import("../src/app/api/brands/route");
    const productsRoute = await import("../src/app/api/products/route");
    const listingsRoute = await import("../src/app/api/listings/route");
    const scoringRoute = await import("../src/app/api/scoring/route");

    const brandResponse = await brandsRoute.POST(new Request("http://localhost/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Independent Test Brand" }),
    }));
    const brand = await brandResponse.json();

    const productResponse = await productsRoute.POST(new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId: brand.id,
        name: "Official Toner",
        msrp: 159000,
        requiredKeywords: ["official", "toner"],
        counterfeitTerms: ["replica", "kw"],
        suspiciousTerms: ["racikan"],
        authorizedSellers: ["Independent Test Official Store"],
        bpomNie: "NA18261203080",
      }),
    }));
    const product = await productResponse.json();

    const listingResponse = await listingsRoute.POST(new Request("http://localhost/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        title: "Official Toner",
        price: 159000,
        sellerName: "Independent Test Official Store",
        listingUrl: "https://marketplace.example.test/official-toner",
        observedAt: "2026-07-24T00:00:00.000Z",
        sourceType: "manual",
      }),
    }));
    const listing = await listingResponse.json();

    const scoreResponse = await scoringRoute.POST(new Request("http://localhost/api/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id }),
    }));
    const score = await scoreResponse.json();

    expect(brandResponse.status).toBe(201);
    expect(productResponse.status).toBe(201);
    expect(listingResponse.status).toBe(201);
    expect(scoreResponse.status).toBe(201);
    expect(score.riskScore).toBe(0);
    expect(score.riskLevel).toBe("low");
    expect(score.recommendedAction).toBe("ignore");
    expect(score.evidenceCompleteness).toBeCloseTo(4 / 6, 6);
    expect(score.confidence).toBe("medium");
    expect(score.reasons.map((reason: { ruleId: string }) => reason.ruleId)).not.toContain("MISSING_EVIDENCE");
    expect(score.reasons.map((reason: { ruleId: string }) => reason.ruleId)).not.toContain("BPOM_NIE_MISMATCH");
  });
});

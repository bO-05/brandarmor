import { describe, expect, it } from "vitest";
import { buildCaseReport, caseReportSchema } from "../src/lib/case-report";
import type { Evidence, Listing, Product, RegulatoryCheck, ReviewDecision, Score, VisualMatchEvidence } from "../src/domain/types";

const listing: Listing = {
  id: "listing-1",
  productId: "product-1",
  title: "Example serum murah no BPOM",
  description: "Candidate listing for review",
  price: 29000,
  currency: "IDR",
  sellerName: "public_seller",
  marketplace: "shopee",
  listingUrl: "https://example.com/listing",
  imageUrls: [],
  screenshotUrl: "https://example.com/placeholder.png",
  sourceConfidence: 0.7,
  rightsStatus: "manual_observation",
  limitations: ["Synthetic demo evidence"],
  observedAt: "2026-07-17T00:00:00.000Z",
  rawSource: null,
  sourceType: "manual",
  ocrStatus: "completed",
  ocrRequestedAt: "2026-07-17T00:00:00.000Z",
  ocrCompletedAt: "2026-07-17T00:00:01.000Z",
  createdAt: "2026-07-17T00:00:00.000Z",
};

const product: Product = {
  id: "product-1",
  brandId: "brand-1",
  name: "Example serum",
  sku: null,
  msrp: 100000,
  msrpCurrency: "IDR",
  msrpMin: null,
  msrpMax: null,
  description: null,
  officialUrls: ["https://example.com/official"],
  officialImageUrls: [],
  requiredKeywords: [],
  suspiciousTerms: [],
  counterfeitTerms: [],
  authorizedSellers: [],
  packagingNotes: null,
  labelNotes: null,
  referenceImageNotes: "Reference notes only",
  category: "skincare_cosmetics",
  variant: null,
  sizeLabel: null,
  bpomNie: "NA18261203080",
  ingredientsHighlights: [],
  packagingClaims: [],
  createdAt: "2026-07-17T00:00:00.000Z",
  updatedAt: "2026-07-17T00:00:00.000Z",
};

const evidence: Evidence[] = [{
  id: "evidence-price",
  listingId: listing.id,
  evidenceType: "numeric",
  fieldName: "price",
  extractedValue: "29000",
  rawValue: "29000",
  confidence: 1,
  notes: null,
  createdAt: "2026-07-17T00:00:00.000Z",
}];

const regulatory: RegulatoryCheck = {
  id: "regulatory-1",
  listingId: listing.id,
  productId: product.id,
  provider: "bpom_api",
  query: "NA18261203080",
  extractedNie: "NA18261203080",
  expectedNie: "NA18261203080",
  status: "verified_active",
  matchedProductName: "Example serum",
  matchedBrandName: "Example brand",
  sourceUrl: "https://cekbpom.pom.go.id/",
  notes: "Verified active",
  bpomLookupDurationMs: 232,
  bpomStatus: "Berlaku",
  createdAt: "2026-07-17T00:00:02.000Z",
};

const visual: VisualMatchEvidence = {
  id: "visual-1",
  listingId: listing.id,
  productId: product.id,
  provider: "mock",
  suspectImageUrl: listing.screenshotUrl,
  referenceImageUrls: [],
  similarityScore: null,
  status: "not_available",
  evidenceSummary: "No visual pair",
  createdAt: "2026-07-17T00:00:02.000Z",
};

const score: Score = {
  id: "score-1",
  listingId: listing.id,
  totalScore: 70,
  ruleScore: 70,
  calibratedScore: 70,
  confidenceBand: "directional",
  riskLevel: "high",
  recommendedAction: "review",
  reasons: [{ ruleId: "PRICE_ANOMALY", ruleName: "Price anomaly", message: "Price is below the baseline.", points: 25, evidenceRefs: ["evidence-price"] }],
  features: {
    ruleScore: 70,
    ocrSuspiciousTermCount: 0,
    priceAnomalyRatio: 0.71,
    sellerAuthorized: false,
    sourceConfidence: 0.7,
    imageSimilarityScore: null,
    regulatoryStatus: "verified_active",
    bpomNieMatch: true,
    packagingFieldMismatchCount: 0,
    ocrConfidence: null,
    evidenceCompleteness: 0.6,
  },
  scoringVersion: "test",
  triggeredRuleIds: ["PRICE_ANOMALY"],
  createdAt: "2026-07-17T00:00:03.000Z",
};

const review: ReviewDecision = {
  id: "review-1",
  listingId: listing.id,
  scoreId: score.id,
  status: "needs_more_evidence",
  reviewer: "private-reviewer@example.test",
  notes: "Internal-only note",
  decidedAt: "2026-07-17T00:00:04.000Z",
  createdAt: "2026-07-17T00:00:04.000Z",
  updatedAt: "2026-07-17T00:00:04.000Z",
};

describe("case report assembler", () => {
  it("builds a valid, claim-safe report with a projected investigation trail", () => {
    const report = buildCaseReport({
      listing,
      product,
      evidence,
      ocr: null,
      regulatory,
      visual,
      score,
      judge: null,
      review,
    }, "2026-07-17T00:05:00.000Z");

    expect(caseReportSchema.parse(report)).toEqual(report);
    expect(report.disclaimer).toContain("not a legal determination");
    expect(report.claimBoundary).toContain("does not automatically confirm");
    expect(report.privacy.includedData).toContain("User-provided");
    expect(report.privacy.excludedData).toContain("may be personal or non-public");
    expect(report.provenance.find((entry) => entry.area === "BPOM/NIE")?.mode).toBe("real");
    expect(report.provenance.find((entry) => entry.area === "Visual comparison")?.mode).toBe("roadmap");
    expect(report.investigation.missingEvidence).toContain("visual_comparison");
    expect(report.investigation.events.map((event) => event.type)).toContain("human_reviewed");
    expect(report.investigation.doNotClaimReasons.join(" ")).not.toContain("No human review decision");
    expect(report.review).toMatchObject({ status: "needs_more_evidence" });
    expect(JSON.stringify(report)).not.toContain("private-reviewer");
    expect(JSON.stringify(report)).not.toContain("Internal-only note");

    const adapterReport = buildCaseReport({
      listing,
      product,
      evidence,
      ocr: null,
      regulatory,
      visual: { ...visual, provider: "siglip_adapter", status: "inconclusive", similarityScore: 0.5 },
      score,
      judge: null,
      review,
    }, "2026-07-17T00:05:00.000Z");
    expect(adapterReport.provenance.find((entry) => entry.area === "Visual comparison")?.mode).toBe("mock");
  });
});

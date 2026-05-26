import { describe, expect, it } from "vitest";
import { inferRegulatoryCheck } from "../src/lib/regulatory-check";
import { inferVisualMatch } from "../src/lib/visual-compare";
import type { Listing, OcrArtifact, Product } from "../src/domain/types";

const product: Product = {
  id: "p1",
  brandId: "b1",
  name: "ExampleBrand Vitamin C Serum 30ml",
  sku: null,
  msrp: 189000,
  msrpCurrency: "IDR",
  msrpMin: 169000,
  msrpMax: 219000,
  description: null,
  officialUrls: [],
  officialImageUrls: ["https://example.com/ref.png"],
  requiredKeywords: ["examplebrand", "serum", "30ml"],
  suspiciousTerms: [],
  counterfeitTerms: [],
  authorizedSellers: ["ExampleBrand Official Store"],
  packagingNotes: null,
  labelNotes: null,
  referenceImageNotes: null,
  category: "skincare_cosmetics",
  variant: "Vitamin C",
  sizeLabel: "30ml",
  bpomNie: "NA18240123456",
  ingredientsHighlights: ["niacinamide"],
  packagingClaims: ["brightening"],
  createdAt: "2026-05-07T00:00:00Z",
  updatedAt: "2026-05-07T00:00:00Z",
};

const listing: Listing = {
  id: "l1",
  productId: "p1",
  title: "ExampleBrand Vitamin C Serum 30ml",
  description: null,
  price: 49000,
  currency: "IDR",
  sellerName: "beauty_racikan",
  marketplace: "shopee",
  listingUrl: "https://example.com/listing",
  imageUrls: ["https://example.com/suspect.png"],
  screenshotUrl: null,
  sourceConfidence: 0.8,
  rightsStatus: "manual_observation",
  limitations: [],
  groundTruth: null,
  observedAt: "2026-05-07T00:00:00Z",
  rawSource: null,
  sourceType: "manual",
  ocrStatus: "completed",
  ocrRequestedAt: null,
  ocrCompletedAt: null,
  createdAt: "2026-05-07T00:00:00Z",
};

describe("cosmetics evidence pipeline adapters", () => {
  it("classifies BPOM/NIE match from OCR fields", () => {
    const ocr = { parsedFields: { bpomNie: "NA18240123456" }, extractedFields: {} } as OcrArtifact;
    const check = inferRegulatoryCheck(listing, product, ocr);
    expect(check.status).toBe("match");
    expect(check.sourceUrl).toContain("cekbpom.pom.go.id");
  });

  it("classifies BPOM/NIE mismatch from OCR fields", () => {
    const ocr = { parsedFields: { bpomNie: "NA18240999999" }, extractedFields: {} } as OcrArtifact;
    const check = inferRegulatoryCheck(listing, product, ocr);
    expect(check.status).toBe("mismatch");
  });

  it("creates visual match evidence with explicit score", () => {
    const visual = inferVisualMatch(listing, product, { similarityScore: 0.32 });
    expect(visual.status).toBe("mismatch");
    expect(visual.evidenceSummary).toContain("32%");
    expect(visual.evidenceSummary).toContain("adapter/mock");
    expect(visual.evidenceSummary).not.toContain("SigLIP");
    expect(visual.evidenceSummary).not.toContain("DINOv2");
  });
});

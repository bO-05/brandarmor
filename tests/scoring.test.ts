import { describe, it, expect } from "vitest";
import {
  checkCounterfeitLanguage,
  checkPriceAnomaly,
  checkUnauthorizedSeller,
  checkMissingEvidence,
  checkTitleMismatch,
  checkSuspiciousTitleClaims,
  computeScore,
  computeRiskLevel,
  computeRecommendedAction,
  SCORING_VERSION,
} from "../src/domain/scoring";

describe("computeRiskLevel", () => {
  it("returns critical for scores >= 80", () => {
    expect(computeRiskLevel(80)).toBe("critical");
    expect(computeRiskLevel(95)).toBe("critical");
  });
  it("returns high for scores 50-79", () => {
    expect(computeRiskLevel(50)).toBe("high");
    expect(computeRiskLevel(75)).toBe("high");
  });
  it("returns medium for scores 20-49", () => {
    expect(computeRiskLevel(20)).toBe("medium");
    expect(computeRiskLevel(35)).toBe("medium");
  });
  it("returns low for scores < 20", () => {
    expect(computeRiskLevel(0)).toBe("low");
    expect(computeRiskLevel(15)).toBe("low");
  });
});

describe("computeRecommendedAction", () => {
  it("enforce for >= 80", () => expect(computeRecommendedAction(85)).toBe("enforce"));
  it("review for 50-79", () => expect(computeRecommendedAction(60)).toBe("review"));
  it("watch for 20-49", () => expect(computeRecommendedAction(30)).toBe("watch"));
  it("ignore for < 20", () => expect(computeRecommendedAction(5)).toBe("ignore"));
});

describe("checkCounterfeitLanguage", () => {
  it("detects replica in title", () => {
    const reason = checkCounterfeitLanguage({ title: "Nike Shoes Replica Grade AAA", description: null });
    expect(reason).not.toBeNull();
    expect(reason!.ruleId).toBe("COUNTERFEIT_LANGUAGE");
    expect(reason!.points).toBe(30);
  });
  it("detects KW in description", () => {
    const reason = checkCounterfeitLanguage({ title: "Batik Premium", description: "Kualitas KW super" });
    expect(reason).not.toBeNull();
  });
  it("returns null for clean listing", () => {
    const reason = checkCounterfeitLanguage({ title: "Authentic Nike Air Max", description: "Original product" });
    expect(reason).toBeNull();
  });
  it("uses custom counterfeit terms from product", () => {
    const reason = checkCounterfeitLanguage(
      { title: "Produk Palsu Murah", description: null },
      { counterfeitTerms: ["palsu", "aspal"] }
    );
    expect(reason).not.toBeNull();
    expect(reason!.message).toContain("palsu");
  });
});

describe("checkPriceAnomaly", () => {
  it("flags price below 50% of MSRP", () => {
    const reason = checkPriceAnomaly({ price: 40000 }, { msrp: 350000 });
    expect(reason).not.toBeNull();
    expect(reason!.ruleId).toBe("PRICE_ANOMALY");
  });
  it("flags price below 70% of msrpMin", () => {
    const reason = checkPriceAnomaly({ price: 100000 }, { msrpMin: 300000 });
    expect(reason).not.toBeNull();
  });
  it("returns null for price within range", () => {
    const reason = checkPriceAnomaly({ price: 300000 }, { msrp: 350000 });
    expect(reason).toBeNull();
  });
  it("returns null when no price", () => {
    const reason = checkPriceAnomaly({ price: null });
    expect(reason).toBeNull();
  });
});

describe("checkUnauthorizedSeller", () => {
  it("flags seller not in authorized list", () => {
    const reason = checkUnauthorizedSeller(
      { sellerName: "random_shop" },
      { authorizedSellers: ["Official Store"] }
    );
    expect(reason).not.toBeNull();
    expect(reason!.ruleId).toBe("UNAUTHORIZED_SELLER");
  });
  it("returns null for authorized seller", () => {
    const reason = checkUnauthorizedSeller(
      { sellerName: "Official Store" },
      { authorizedSellers: ["Official Store"] }
    );
    expect(reason).toBeNull();
  });
  it("returns null when no authorized sellers defined", () => {
    const reason = checkUnauthorizedSeller({ sellerName: "anyone" }, { authorizedSellers: [] });
    expect(reason).toBeNull();
  });
  it("returns null when no seller name", () => {
    const reason = checkUnauthorizedSeller({ sellerName: null });
    expect(reason).toBeNull();
  });
});

describe("checkMissingEvidence", () => {
  it("flags listing with missing title and price", () => {
    const reason = checkMissingEvidence({ title: null, price: null, sellerName: "test", imageUrls: [], listingUrl: null });
    expect(reason).not.toBeNull();
    expect(reason!.message).toContain("title");
    expect(reason!.message).toContain("price");
  });
  it("returns null for complete listing", () => {
    const reason = checkMissingEvidence({ title: "Test", price: 100, sellerName: "test", imageUrls: ["http://img.jpg"], listingUrl: null });
    expect(reason).toBeNull();
  });
});

describe("checkTitleMismatch", () => {
  it("flags title missing required keywords", () => {
    const reason = checkTitleMismatch(
      { title: "Random Product" },
      { requiredKeywords: ["batik", "premium"] }
    );
    expect(reason).not.toBeNull();
    expect(reason!.ruleId).toBe("TITLE_MISMATCH");
  });
  it("returns null when enough keywords match", () => {
    const reason = checkTitleMismatch(
      { title: "Batik Premium Nusantara" },
      { requiredKeywords: ["batik", "premium"] }
    );
    expect(reason).toBeNull();
  });
});

describe("checkSuspiciousTitleClaims", () => {
  it("detects style in title", () => {
    const reason = checkSuspiciousTitleClaims({ title: "Batik Style Premium" });
    expect(reason).not.toBeNull();
    expect(reason!.ruleId).toBe("SUSPICIOUS_TITLE_CLAIMS");
  });
  it("detects inspired in title", () => {
    const reason = checkSuspiciousTitleClaims({ title: "Inspired by Nike" });
    expect(reason).not.toBeNull();
  });
  it("returns null for clean title", () => {
    const reason = checkSuspiciousTitleClaims({ title: "Original Nike Shoes" });
    expect(reason).toBeNull();
  });
});

describe("computeScore - integration", () => {
  it("obvious counterfeit scores high", () => {
    const score = computeScore(
      { title: "Nike Replica Grade AAA Murah", description: "KW super", price: 50000, sellerName: "fake_shop", imageUrls: [], listingUrl: null },
      { msrp: 2000000, requiredKeywords: ["nike", "air"], suspiciousTerms: ["style"], counterfeitTerms: ["replica", "kw"], authorizedSellers: ["Nike Official"] }
    );
    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(["high", "critical"]).toContain(score.riskLevel);
  });

  it("authorized discount is low risk", () => {
    const score = computeScore(
      { title: "Nike Air Max Original", description: "Diskon resmi", price: 1500000, sellerName: "Nike Official", imageUrls: ["img"], listingUrl: null },
      { msrp: 2000000, requiredKeywords: ["nike", "air"], suspiciousTerms: [], counterfeitTerms: [], authorizedSellers: ["Nike Official"] }
    );
    expect(score.totalScore).toBeLessThan(20);
    expect(score.riskLevel).toBe("low");
    expect(score.recommendedAction).toBe("ignore");
  });

  it("secondhand resale is medium-low", () => {
    const score = computeScore(
      { title: "Nike Air Max Second", description: "Bekas pakai", price: 1000000, sellerName: "preloved_shop", imageUrls: [], listingUrl: null },
      { msrp: 2000000 }
    );
    expect(score.totalScore).toBeLessThan(50);
  });

  it("scores version is set", () => {
    const score = computeScore({ title: "Test", price: 100, sellerName: "test", imageUrls: [], listingUrl: null });
    expect(score.scoringVersion).toBe(SCORING_VERSION);
    expect(score.calibratedScore).toBe(score.totalScore);
    expect(score.features.ruleScore).toBe(score.ruleScore);
  });

  it("uses OCR evidence in calibrated scoring", () => {
    const score = computeScore(
      { title: "Batik Nusantara Premium", price: 50000, sellerName: "unknown_shop", imageUrls: [], listingUrl: "https://example.com", sourceConfidence: 0.8, limitations: [] },
      { msrp: 350000, requiredKeywords: ["batik", "nusantara"], counterfeitTerms: ["kw", "grade"], suspiciousTerms: ["mirror"], authorizedSellers: ["Batik Nusantara Official"] },
      { markdown: "Label gambar menampilkan KW Grade AAA mirror quality", suspiciousTermCount: 3, averageConfidence: 0.88 }
    );
    expect(score.triggeredRuleIds).toContain("OCR_COUNTERFEIT_TEXT");
    expect(score.features.ocrSuspiciousTermCount).toBe(3);
    expect(score.totalScore).toBeGreaterThanOrEqual(80);
    expect(score.confidenceBand).toBe("strong");
  });

  it("flags cosmetics BPOM/NIE and packaging mismatches", () => {
    const score = computeScore(
      { title: "ExampleBrand Vitamin C Serum 20ml", price: 49000, sellerName: "beauty_racikan", imageUrls: ["img"], listingUrl: "https://example.com", sourceConfidence: 0.85, limitations: [] },
      { msrp: 189000, requiredKeywords: ["examplebrand", "serum", "30ml"], counterfeitTerms: ["no bpom"], suspiciousTerms: ["racikan"], authorizedSellers: ["ExampleBrand Official Store"], bpomNie: "NA18240123456", sizeLabel: "30ml", ingredientsHighlights: ["niacinamide"], packagingClaims: ["brightening"] },
      {
        markdown: "ExampleBrand Serum No BPOM 20ml Ingredients aqua",
        suspiciousTermCount: 1,
        averageConfidence: 0.9,
        parsedFields: {
          bpomNie: null,
          volumeOrSize: "20ml",
          expiryDate: null,
          batchOrLot: null,
          barcodeOrQrText: null,
          ingredientsText: "Ingredients aqua",
          claims: ["No BPOM"],
          brandMentions: ["ExampleBrand"],
          productMentions: ["Serum"],
        },
      },
      { status: "not_found", extractedNie: null, expectedNie: "NA18240123456" },
      { similarityScore: 0.35, status: "mismatch" }
    );
    expect(score.triggeredRuleIds).toContain("BPOM_NIE_MISMATCH");
    expect(score.triggeredRuleIds).toContain("PACKAGING_FIELD_MISMATCH");
    expect(score.triggeredRuleIds).toContain("VISUAL_MISMATCH");
    expect(score.totalScore).toBeGreaterThanOrEqual(80);
  });

  it("caps score at 100", () => {
    const score = computeScore(
      { title: "Replica KW Grade AAA 1:1 Mirror", description: "clone copy imitasi tiruan", price: 1000, sellerName: "bad_guy", imageUrls: [], listingUrl: null },
      { msrp: 500000, requiredKeywords: ["original"], suspiciousTerms: ["style", "inspired"], counterfeitTerms: ["replica", "kw"], authorizedSellers: ["Official"] }
    );
    expect(score.totalScore).toBeLessThanOrEqual(100);
  });
});

import type { Listing, Product, Score, ScoringReason, RiskLevel, RecommendedAction, OcrArtifact, CalibratedScoreFeatures, RegulatoryCheck, VisualMatchEvidence } from "./types";

export const SCORING_VERSION = "2.0.0-v4-evidence";

export const SCORING_RULES = {
  COUNTERFEIT_LANGUAGE: {
    id: "COUNTERFEIT_LANGUAGE",
    name: "Suspicious / Counterfeit Language",
    description: "Title or description contains counterfeit-indicating terms",
    points: 30,
    riskContribution: "high" as const,
  },
  PRICE_ANOMALY: {
    id: "PRICE_ANOMALY",
    name: "Price Anomaly",
    description: "Price is significantly below MSRP range",
    points: 25,
    riskContribution: "high" as const,
  },
  UNAUTHORIZED_SELLER: {
    id: "UNAUTHORIZED_SELLER",
    name: "Unauthorized Seller",
    description: "Seller is not in authorized sellers list",
    points: 20,
    riskContribution: "medium" as const,
  },
  MISSING_EVIDENCE: {
    id: "MISSING_EVIDENCE",
    name: "Missing / Weak Evidence",
    description: "Listing is missing key identifying information",
    points: 10,
    riskContribution: "low" as const,
  },
  TITLE_MISMATCH: {
    id: "TITLE_MISMATCH",
    name: "Title / Product Mismatch",
    description: "Listing title does not contain required official keywords",
    points: 15,
    riskContribution: "medium" as const,
  },
  SUSPICIOUS_TITLE_CLAIMS: {
    id: "SUSPICIOUS_TITLE_CLAIMS",
    name: "Suspicious Title Claims",
    description: "Title contains claims like replica, grade AAA, inspired, style",
    points: 25,
    riskContribution: "high" as const,
  },
  OCR_COUNTERFEIT_TEXT: {
    id: "OCR_COUNTERFEIT_TEXT",
    name: "OCR Counterfeit Text",
    description: "OCR found counterfeit or suspicious claims in listing imagery",
    points: 25,
    riskContribution: "high" as const,
  },
  LOW_SOURCE_CONFIDENCE: {
    id: "LOW_SOURCE_CONFIDENCE",
    name: "Low Source Confidence",
    description: "Source evidence is weak, stale, or user-marked as limited",
    points: 8,
    riskContribution: "low" as const,
  },
  BPOM_NIE_MISMATCH: {
    id: "BPOM_NIE_MISMATCH",
    name: "BPOM / NIE Mismatch",
    description: "Extracted cosmetics registration evidence is missing or mismatched",
    points: 30,
    riskContribution: "high" as const,
  },
  PACKAGING_FIELD_MISMATCH: {
    id: "PACKAGING_FIELD_MISMATCH",
    name: "Packaging Field Mismatch",
    description: "OCR-visible package fields do not match the official baseline",
    points: 18,
    riskContribution: "medium" as const,
  },
  VISUAL_MISMATCH: {
    id: "VISUAL_MISMATCH",
    name: "Visual Package Mismatch",
    description: "Suspect packaging is visually weak against reference images",
    points: 18,
    riskContribution: "medium" as const,
  },
} as const;

const DEFAULT_COUNTERFEIT_TERMS = [
  "replica", "kw", "grade aaa", "grade a", "super aaa", "super copy",
  "1:1", "mirror quality", "mirror", "oem", "clone", "copy", "imitasi",
  "tiruan", "aspal", "premium grade", "master copy", "master quality",
];

const DEFAULT_SUSPICIOUS_TERMS = [
  "style", "inspired", "like", "type", "model", "versi", "ala",
  "sejenis", "serupa", "mirip",
  "share in jar", "racikan", "tanpa bpom", "no bpom", "bpom palsu",
];

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function diffPercent(listingPrice: number, msrp: number): number {
  return Math.round(((msrp - listingPrice) / msrp) * 100);
}

export function checkCounterfeitLanguage(
  listing: Partial<Pick<Listing, "title" | "description">>,
  product?: Partial<Pick<Product, "counterfeitTerms">>
): ScoringReason | null {
  const text = normalize(listing.title) + " " + normalize(listing.description);
  const terms = product?.counterfeitTerms?.length ? product.counterfeitTerms : DEFAULT_COUNTERFEIT_TERMS;
  const found = terms.filter((t) => text.includes(normalize(t)));
  if (found.length === 0) return null;
  return {
    ruleId: SCORING_RULES.COUNTERFEIT_LANGUAGE.id,
    ruleName: SCORING_RULES.COUNTERFEIT_LANGUAGE.name,
    message: `Counterfeit indicator terms found: ${found.join(", ")}`,
    points: SCORING_RULES.COUNTERFEIT_LANGUAGE.points,
    evidenceRefs: [],
  };
}

export function checkPriceAnomaly(
  listing: Partial<Pick<Listing, "price">>,
  product?: Partial<Pick<Product, "msrp" | "msrpMin" | "msrpMax">>
): ScoringReason | null {
  if (listing.price == null) return null;
  const msrp = product?.msrp ?? null;
  if (msrp && listing.price < msrp * 0.5) {
    const diff = diffPercent(listing.price, msrp);
    return {
      ruleId: SCORING_RULES.PRICE_ANOMALY.id,
      ruleName: SCORING_RULES.PRICE_ANOMALY.name,
      message: `Price ${listing.price} is ${diff}% below MSRP ${msrp}`,
      points: SCORING_RULES.PRICE_ANOMALY.points,
      evidenceRefs: [],
    };
  }
  const msrpMin = product?.msrpMin ?? null;
  if (msrpMin && listing.price < msrpMin * 0.7) {
    return {
      ruleId: SCORING_RULES.PRICE_ANOMALY.id,
      ruleName: SCORING_RULES.PRICE_ANOMALY.name,
      message: `Price ${listing.price} below minimum MSRP range ${msrpMin}`,
      points: SCORING_RULES.PRICE_ANOMALY.points,
      evidenceRefs: [],
    };
  }
  return null;
}

export function checkUnauthorizedSeller(
  listing: Partial<Pick<Listing, "sellerName">>,
  product?: Partial<Pick<Product, "authorizedSellers">>
): ScoringReason | null {
  if (!listing.sellerName) return null;
  const authorized = product?.authorizedSellers ?? [];
  if (authorized.length === 0) return null;
  const sellerLower = normalize(listing.sellerName);
  const isAuthorized = authorized.some((s) => normalize(s) === sellerLower);
  if (!isAuthorized) {
    return {
      ruleId: SCORING_RULES.UNAUTHORIZED_SELLER.id,
      ruleName: SCORING_RULES.UNAUTHORIZED_SELLER.name,
      message: `Seller \"${listing.sellerName}\" is not in the authorized sellers list`,
      points: SCORING_RULES.UNAUTHORIZED_SELLER.points,
      evidenceRefs: [],
    };
  }
  return null;
}

export function checkMissingEvidence(
  listing: Partial<Pick<Listing, "title" | "price" | "sellerName" | "imageUrls" | "listingUrl">>
): ScoringReason | null {
  const missing: string[] = [];
  if (!listing.title) missing.push("title");
  if (listing.price == null) missing.push("price");
  if (!listing.sellerName) missing.push("seller");
  if (!listing.imageUrls?.length) missing.push("images");
  if (missing.length === 0) return null;
  const severity = missing.length >= 3 ? 10 : Math.max(Math.floor(10 * (missing.length / 4)), 5);
  return {
    ruleId: SCORING_RULES.MISSING_EVIDENCE.id,
    ruleName: SCORING_RULES.MISSING_EVIDENCE.name,
    message: `Missing evidence fields: ${missing.join(", ")}`,
    points: severity,
    evidenceRefs: [],
  };
}

export function checkTitleMismatch(
  listing: Partial<Pick<Listing, "title">>,
  product?: Partial<Pick<Product, "requiredKeywords">>
): ScoringReason | null {
  if (!listing.title) return null;
  const keywords = product?.requiredKeywords ?? [];
  if (keywords.length === 0) return null;
  const titleLower = normalize(listing.title);
  const missing = keywords.filter((k) => !titleLower.includes(normalize(k)));
  if (missing.length === 0) return null;
  const matchRatio = (keywords.length - missing.length) / keywords.length;
  if (matchRatio < 0.5) {
    return {
      ruleId: SCORING_RULES.TITLE_MISMATCH.id,
      ruleName: SCORING_RULES.TITLE_MISMATCH.name,
      message: `Weak official keyword match. Missing: ${missing.join(", ")}`,
      points: SCORING_RULES.TITLE_MISMATCH.points,
      evidenceRefs: [],
    };
  }
  return null;
}

export function checkSuspiciousTitleClaims(
  listing: Partial<Pick<Listing, "title">>,
  product?: Partial<Pick<Product, "suspiciousTerms">>
): ScoringReason | null {
  if (!listing.title) return null;
  const text = normalize(listing.title);
  const terms = product?.suspiciousTerms?.length ? product.suspiciousTerms : DEFAULT_SUSPICIOUS_TERMS;
  const found = terms.filter((t) => {
    const n = normalize(t);
    return text.split(/\s+/).includes(n) || text.includes(" " + n + " ") || text.startsWith(n + " ") || text.endsWith(" " + n) || text === n;
  });
  if (found.length === 0) return null;
  return {
    ruleId: SCORING_RULES.SUSPICIOUS_TITLE_CLAIMS.id,
    ruleName: SCORING_RULES.SUSPICIOUS_TITLE_CLAIMS.name,
    message: `Suspicious title claims: ${found.join(", ")}`,
    points: SCORING_RULES.SUSPICIOUS_TITLE_CLAIMS.points,
    evidenceRefs: [],
  };
}

export function checkOcrCounterfeitText(
  artifact?: Partial<Pick<OcrArtifact, "markdown" | "suspiciousTermCount" | "averageConfidence">> | null,
  product?: Partial<Pick<Product, "counterfeitTerms" | "suspiciousTerms">>
): ScoringReason | null {
  if (!artifact?.markdown) return null;
  const text = normalize(artifact.markdown);
  const terms = [
    ...(product?.counterfeitTerms?.length ? product.counterfeitTerms : DEFAULT_COUNTERFEIT_TERMS),
    ...(product?.suspiciousTerms?.length ? product.suspiciousTerms : DEFAULT_SUSPICIOUS_TERMS),
  ];
  const found = Array.from(new Set(terms.filter((t) => text.includes(normalize(t)))));
  const count = Math.max(artifact.suspiciousTermCount ?? 0, found.length);
  if (count === 0) return null;
  const confidence = artifact.averageConfidence == null ? "" : ` OCR confidence ${Math.round(artifact.averageConfidence * 100)}%.`;
  return {
    ruleId: SCORING_RULES.OCR_COUNTERFEIT_TEXT.id,
    ruleName: SCORING_RULES.OCR_COUNTERFEIT_TEXT.name,
    message: `OCR found suspicious text: ${found.slice(0, 6).join(", ") || `${count} terms`}.${confidence}`,
    points: SCORING_RULES.OCR_COUNTERFEIT_TEXT.points,
    evidenceRefs: [],
  };
}

export function checkLowSourceConfidence(listing: Partial<Pick<Listing, "sourceConfidence" | "limitations">>): ScoringReason | null {
  const confidence = listing.sourceConfidence ?? 0.6;
  const limitations = listing.limitations ?? [];
  if (confidence >= 0.5 && limitations.length === 0) return null;
  return {
    ruleId: SCORING_RULES.LOW_SOURCE_CONFIDENCE.id,
    ruleName: SCORING_RULES.LOW_SOURCE_CONFIDENCE.name,
    message: `Source confidence is ${Math.round(confidence * 100)}%${limitations.length ? `; limitations: ${limitations.join(", ")}` : ""}`,
    points: SCORING_RULES.LOW_SOURCE_CONFIDENCE.points,
    evidenceRefs: [],
  };
}

export function checkBpomNieMismatch(
  artifact?: Partial<Pick<OcrArtifact, "parsedFields" | "averageConfidence">> | null,
  product?: Partial<Pick<Product, "bpomNie">>,
  regulatory?: Pick<RegulatoryCheck, "status" | "extractedNie" | "expectedNie"> | null
): ScoringReason | null {
  const expected = normalize(product?.bpomNie ?? regulatory?.expectedNie);
  const extracted = normalize(artifact?.parsedFields?.bpomNie ?? regulatory?.extractedNie);
  if (!expected && !extracted && !regulatory) return null;
  if (regulatory?.status === "mismatch" || (expected && extracted && expected !== extracted)) {
    return {
      ruleId: SCORING_RULES.BPOM_NIE_MISMATCH.id,
      ruleName: SCORING_RULES.BPOM_NIE_MISMATCH.name,
      message: `BPOM/NIE mismatch: expected ${product?.bpomNie ?? regulatory?.expectedNie ?? "unknown"}, extracted ${artifact?.parsedFields?.bpomNie ?? regulatory?.extractedNie ?? "missing"}`,
      points: SCORING_RULES.BPOM_NIE_MISMATCH.points,
      evidenceRefs: [],
    };
  }
  if (expected && !extracted) {
    return {
      ruleId: SCORING_RULES.BPOM_NIE_MISMATCH.id,
      ruleName: SCORING_RULES.BPOM_NIE_MISMATCH.name,
      message: `Official baseline expects BPOM/NIE ${product?.bpomNie}, but OCR did not find it`,
      points: 16,
      evidenceRefs: [],
    };
  }
  if (regulatory?.status === "not_found") {
    return {
      ruleId: SCORING_RULES.BPOM_NIE_MISMATCH.id,
      ruleName: SCORING_RULES.BPOM_NIE_MISMATCH.name,
      message: `Extracted BPOM/NIE ${regulatory.extractedNie ?? "unknown"} was not verified`,
      points: 22,
      evidenceRefs: [],
    };
  }
  return null;
}

export function countPackagingMismatches(
  artifact?: Partial<Pick<OcrArtifact, "parsedFields">> | null,
  product?: Partial<Pick<Product, "sizeLabel" | "packagingClaims" | "ingredientsHighlights">>
): number {
  if (!artifact?.parsedFields) return 0;
  let mismatches = 0;
  const fields = artifact.parsedFields;
  if (product?.sizeLabel && fields.volumeOrSize && normalize(product.sizeLabel) !== normalize(fields.volumeOrSize)) mismatches += 1;
  const ocrText = normalize([fields.ingredientsText, ...fields.claims].filter(Boolean).join(" "));
  for (const term of product?.ingredientsHighlights ?? []) {
    if (term && ocrText && !ocrText.includes(normalize(term))) mismatches += 1;
  }
  for (const claim of product?.packagingClaims ?? []) {
    if (claim && ocrText && !ocrText.includes(normalize(claim))) mismatches += 1;
  }
  return mismatches;
}

export function checkPackagingFieldMismatch(
  artifact?: Partial<Pick<OcrArtifact, "parsedFields">> | null,
  product?: Partial<Pick<Product, "sizeLabel" | "packagingClaims" | "ingredientsHighlights">>
): ScoringReason | null {
  const mismatches = countPackagingMismatches(artifact, product);
  if (mismatches === 0) return null;
  return {
    ruleId: SCORING_RULES.PACKAGING_FIELD_MISMATCH.id,
    ruleName: SCORING_RULES.PACKAGING_FIELD_MISMATCH.name,
    message: `${mismatches} OCR-visible packaging fields differ from official baseline`,
    points: Math.min(30, SCORING_RULES.PACKAGING_FIELD_MISMATCH.points + (mismatches - 1) * 4),
    evidenceRefs: [],
  };
}

export function checkVisualMismatch(visual?: Pick<VisualMatchEvidence, "similarityScore" | "status"> | null): ScoringReason | null {
  if (!visual || visual.status === "not_available" || visual.similarityScore == null) return null;
  if (visual.status === "mismatch" || visual.similarityScore < 0.45) {
    return {
      ruleId: SCORING_RULES.VISUAL_MISMATCH.id,
      ruleName: SCORING_RULES.VISUAL_MISMATCH.name,
      message: `Visual package similarity is weak (${Math.round(visual.similarityScore * 100)}%)`,
      points: SCORING_RULES.VISUAL_MISMATCH.points,
      evidenceRefs: [],
    };
  }
  return null;
}

export function extractCalibratedFeatures(
  listing: Partial<Pick<Listing, "title" | "description" | "price" | "sellerName" | "imageUrls" | "listingUrl" | "screenshotUrl" | "sourceConfidence">>,
  product?: Partial<Pick<Product, "msrp" | "msrpMin" | "authorizedSellers">>,
  artifact?: Partial<Pick<OcrArtifact, "suspiciousTermCount" | "averageConfidence">> | null,
  ruleScore = 0,
  regulatory?: Pick<RegulatoryCheck, "status" | "extractedNie" | "expectedNie"> | null,
  visual?: Pick<VisualMatchEvidence, "similarityScore" | "status"> | null,
  packagingFieldMismatchCount = 0
): CalibratedScoreFeatures {
  const msrp = product?.msrp ?? product?.msrpMin ?? null;
  const priceAnomalyRatio = msrp && listing.price ? Math.max(0, (msrp - listing.price) / msrp) : null;
  const authorized = product?.authorizedSellers ?? [];
  const sellerAuthorized = listing.sellerName && authorized.length
    ? authorized.some((s) => normalize(s) === normalize(listing.sellerName))
    : null;
  const evidenceFields = [
    Boolean(listing.title),
    listing.price != null,
    Boolean(listing.sellerName),
    Boolean(listing.listingUrl),
    Boolean(listing.imageUrls?.length || listing.screenshotUrl),
    Boolean(artifact?.averageConfidence != null),
  ];
  return {
    ruleScore,
    ocrSuspiciousTermCount: artifact?.suspiciousTermCount ?? 0,
    priceAnomalyRatio,
    sellerAuthorized,
    sourceConfidence: listing.sourceConfidence ?? 0.6,
    imageSimilarityScore: visual?.similarityScore ?? null,
    regulatoryStatus: regulatory?.status ?? null,
    bpomNieMatch: regulatory?.status === "match" ? true : regulatory?.status === "mismatch" || regulatory?.status === "not_found" ? false : null,
    packagingFieldMismatchCount,
    ocrConfidence: artifact?.averageConfidence ?? null,
    evidenceCompleteness: evidenceFields.filter(Boolean).length / evidenceFields.length,
  };
}

export function calibrateScore(features: CalibratedScoreFeatures): { calibratedScore: number; confidenceBand: Score["confidenceBand"] } {
  let score = features.ruleScore;
  score += Math.min(18, features.ocrSuspiciousTermCount * 6);
  if (features.priceAnomalyRatio != null && features.priceAnomalyRatio > 0.6) score += 8;
  if (features.sellerAuthorized === true) score -= 18;
  if (features.sellerAuthorized === false) score += 6;
  if (features.bpomNieMatch === true) score -= 12;
  if (features.bpomNieMatch === false) score += 12;
  if (features.packagingFieldMismatchCount > 0) score += Math.min(10, features.packagingFieldMismatchCount * 3);
  if (features.imageSimilarityScore != null && features.imageSimilarityScore < 0.45) score += 8;
  if (features.imageSimilarityScore != null && features.imageSimilarityScore > 0.8) score -= 8;
  if (features.sourceConfidence < 0.45) score -= 5;
  if (features.ocrConfidence != null && features.ocrConfidence < 0.55) score -= 8;
  score += Math.round((features.evidenceCompleteness - 0.5) * 10);
  const calibratedScore = Math.max(0, Math.min(100, Math.round(score)));
  const confidenceBand: Score["confidenceBand"] =
    features.evidenceCompleteness < 0.35 ? "low_evidence" :
    features.evidenceCompleteness < 0.55 ? "directional" :
    features.ocrConfidence != null || features.imageSimilarityScore != null ? "strong" : "supported";
  return { calibratedScore, confidenceBand };
}

export function computeScore(
  listing: Partial<Pick<Listing, "title" | "description" | "price" | "sellerName" | "imageUrls" | "listingUrl" | "screenshotUrl" | "sourceConfidence" | "limitations">>,
  product?: Partial<Pick<Product, "msrp" | "msrpMin" | "msrpMax" | "requiredKeywords" | "counterfeitTerms" | "suspiciousTerms" | "authorizedSellers" | "bpomNie" | "sizeLabel" | "packagingClaims" | "ingredientsHighlights">>,
  artifact?: Partial<Pick<OcrArtifact, "markdown" | "suspiciousTermCount" | "averageConfidence" | "parsedFields">> | null,
  regulatory?: Pick<RegulatoryCheck, "status" | "extractedNie" | "expectedNie"> | null,
  visual?: Pick<VisualMatchEvidence, "similarityScore" | "status"> | null
): Omit<Score, "id" | "listingId" | "createdAt"> {
  const reasons: ScoringReason[] = [];
  const r1 = checkCounterfeitLanguage(listing, product);
  if (r1) reasons.push(r1);
  const r2 = checkPriceAnomaly(listing, product);
  if (r2) reasons.push(r2);
  const r3 = checkUnauthorizedSeller(listing, product);
  if (r3) reasons.push(r3);
  const r4 = checkMissingEvidence(listing);
  if (r4) reasons.push(r4);
  const r5 = checkTitleMismatch(listing, product);
  if (r5) reasons.push(r5);
  const r6 = checkSuspiciousTitleClaims(listing, product);
  if (r6) reasons.push(r6);
  const r7 = checkOcrCounterfeitText(artifact, product);
  if (r7) reasons.push(r7);
  const r8 = checkLowSourceConfidence(listing);
  if (r8) reasons.push(r8);
  const r9 = checkBpomNieMismatch(artifact, product, regulatory);
  if (r9) reasons.push(r9);
  const r10 = checkPackagingFieldMismatch(artifact, product);
  if (r10) reasons.push(r10);
  const r11 = checkVisualMismatch(visual);
  if (r11) reasons.push(r11);
  const ruleScore = Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0));
  const packagingFieldMismatchCount = countPackagingMismatches(artifact, product);
  const features = extractCalibratedFeatures(listing, product, artifact, ruleScore, regulatory, visual, packagingFieldMismatchCount);
  const { calibratedScore, confidenceBand } = calibrateScore(features);
  const totalScore = calibratedScore;
  return {
    totalScore,
    ruleScore,
    calibratedScore,
    confidenceBand,
    riskLevel: computeRiskLevel(totalScore),
    recommendedAction: computeRecommendedAction(totalScore),
    reasons,
    features,
    scoringVersion: SCORING_VERSION,
    triggeredRuleIds: reasons.map((r) => r.ruleId),
  };
}

export function computeRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export function computeRecommendedAction(score: number): RecommendedAction {
  if (score >= 80) return "enforce";
  if (score >= 50) return "review";
  if (score >= 20) return "watch";
  return "ignore";
}

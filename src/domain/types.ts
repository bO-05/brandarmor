// BrandArmor v4 - Core Domain Types
export type BrandId = string;
export type ProductId = string;
export type ListingId = string;
export type EvidenceId = string;
export type ScoreId = string;
export type ReviewDecisionId = string;
export type EvaluationCaseId = string;
export type OfficialAssetId = string;
export type RegulatoryCheckId = string;
export type VisualMatchId = string;
export type LlmJudgeAssessmentId = string;

export interface Brand {
  id: BrandId;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: ProductId;
  brandId: BrandId;
  name: string;
  sku: string | null;
  msrp: number | null;
  msrpCurrency: string | null;
  msrpMin: number | null;
  msrpMax: number | null;
  description: string | null;
  officialUrls: string[];
  officialImageUrls: string[];
  requiredKeywords: string[];
  suspiciousTerms: string[];
  counterfeitTerms: string[];
  authorizedSellers: string[];
  packagingNotes: string | null;
  labelNotes: string | null;
  referenceImageNotes: string | null;
  category: string;
  variant: string | null;
  sizeLabel: string | null;
  bpomNie: string | null;
  ingredientsHighlights: string[];
  packagingClaims: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProductBaseline = Product;

export interface OfficialAsset {
  id: OfficialAssetId;
  productId: ProductId;
  assetType: string;
  value: string;
  label: string | null;
  createdAt: string;
}

export interface Listing {
  id: ListingId;
  productId: ProductId | null;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  sellerName: string | null;
  marketplace: string | null;
  listingUrl: string | null;
  imageUrls: string[];
  screenshotUrl: string | null;
  sourceConfidence: number;
  rightsStatus: string;
  limitations: string[];
  groundTruth: GroundTruthLabel | null;
  observedAt: string;
  rawSource: unknown | null;
  sourceType: string;
  ocrStatus: "not_requested" | "pending" | "completed" | "failed";
  ocrRequestedAt: string | null;
  ocrCompletedAt: string | null;
  createdAt: string;
}

export interface OcrArtifact {
  id: string;
  listingId: ListingId;
  provider: "mistral" | "mock";
  model: string;
  status: "completed" | "failed";
  sourceImageUrl: string | null;
  markdown: string;
  rawJson: unknown | null;
  averageConfidence: number | null;
  suspiciousTermCount: number;
  extractedFields: Record<string, string>;
  parsedFields: ParsedPackagingFields;
  usageInfo: unknown | null;
  error: string | null;
  createdAt: string;
}

export interface ParsedPackagingFields {
  bpomNie: string | null;
  volumeOrSize: string | null;
  expiryDate: string | null;
  batchOrLot: string | null;
  barcodeOrQrText: string | null;
  ingredientsText: string | null;
  claims: string[];
  brandMentions: string[];
  productMentions: string[];
}

export interface Evidence {
  id: EvidenceId;
  listingId: ListingId;
  evidenceType: string;
  fieldName: string;
  extractedValue: string;
  rawValue: string | null;
  confidence: number | null;
  notes: string | null;
  createdAt: string;
}

export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  points: number;
  riskContribution: string;
}

export interface ScoringReason {
  ruleId: string;
  ruleName: string;
  message: string;
  points: number;
  evidenceRefs: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RecommendedAction = 'ignore' | 'watch' | 'review' | 'enforce';

export interface Score {
  id: ScoreId;
  listingId: ListingId;
  totalScore: number;
  ruleScore: number;
  calibratedScore: number;
  confidenceBand: "low_evidence" | "directional" | "supported" | "strong";
  riskLevel: RiskLevel;
  recommendedAction: RecommendedAction;
  reasons: ScoringReason[];
  features: CalibratedScoreFeatures;
  scoringVersion: string;
  triggeredRuleIds: string[];
  createdAt: string;
}

export interface RegulatoryCheck {
  id: RegulatoryCheckId;
  listingId: ListingId;
  productId: ProductId | null;
  provider: "bpom_manual" | "bpom_linkout" | "bpom_api" | "mock";
  query: string | null;
  extractedNie: string | null;
  expectedNie: string | null;
  status: "not_found" | "match" | "mismatch" | "needs_manual_check" | "not_available" | "verified_active" | "verified_expired" | "brand_mismatch";
  matchedProductName: string | null;
  matchedBrandName: string | null;
  sourceUrl: string | null;
  notes: string | null;
  bpomLookupDurationMs?: number | null;
  bpomStatus?: string | null;
  createdAt: string;
}

export interface VisualMatchEvidence {
  id: VisualMatchId;
  listingId: ListingId;
  productId: ProductId | null;
  provider: "mock" | "siglip_adapter" | "manual";
  suspectImageUrl: string | null;
  referenceImageUrls: string[];
  similarityScore: number | null;
  status: "match" | "mismatch" | "inconclusive" | "not_available";
  evidenceSummary: string;
  createdAt: string;
}

export interface LlmJudgeAssessment {
  id: LlmJudgeAssessmentId;
  listingId: ListingId;
  scoreId: ScoreId | null;
  provider: "anthropic" | "mistral" | "mock";
  model: string;
  judgeRisk: RiskLevel | "insufficient_evidence";
  confidence: "low" | "medium" | "high";
  supportedReasons: string[];
  contradictions: string[];
  missingEvidence: string[];
  recommendedNextAction: string;
  citedEvidenceIds: string[];
  doNotClaimReasons: string[];
  rawJson: unknown | null;
  error: string | null;
  createdAt: string;
}

export type ReviewStatus =
  | 'pending'
  | 'confirmed_counterfeit'
  | 'likely_counterfeit'
  | 'rejected_legitimate'
  | 'gray_market_import'
  | 'expired_or_unsafe'
  | 'needs_more_evidence'
  | 'escalated';

export interface ReviewDecision {
  id: ReviewDecisionId;
  listingId: ListingId;
  scoreId: ScoreId;
  status: ReviewStatus;
  reviewer: string | null;
  notes: string | null;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type GroundTruthLabel =
  | 'counterfeit'
  | 'legitimate'
  | 'likely_counterfeit'
  | 'gray_market_import'
  | 'expired_or_unsafe'
  | 'insufficient_evidence'
  | 'unknown';

export interface CalibratedScoreFeatures {
  ruleScore: number;
  ocrSuspiciousTermCount: number;
  priceAnomalyRatio: number | null;
  sellerAuthorized: boolean | null;
  sourceConfidence: number;
  imageSimilarityScore: number | null;
  regulatoryStatus: RegulatoryCheck["status"] | null;
  bpomNieMatch: boolean | null;
  packagingFieldMismatchCount: number;
  ocrConfidence: number | null;
  evidenceCompleteness: number;
}

export interface EvaluationCase {
  id: EvaluationCaseId;
  listing: Omit<Listing, 'id' | 'productId' | 'rawSource' | 'sourceType' | 'createdAt'>;
  groundTruth: GroundTruthLabel;
  notes: string | null;
  createdAt: string;
}

export interface EvaluationMetrics {
  threshold: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  accuracy: number;
  precisionAtK: number;
  reviewBurden: number;
  totalCases: number;
}

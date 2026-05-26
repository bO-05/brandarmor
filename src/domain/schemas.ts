import { z } from "zod";

export const insertBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type InsertBrand = z.infer<typeof insertBrandSchema>;

export const insertProductSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().nullable().optional(),
  msrp: z.number().positive().nullable().optional(),
  msrpCurrency: z.string().length(3).nullable().optional().default("IDR"),
  msrpMin: z.number().positive().nullable().optional(),
  msrpMax: z.number().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  officialUrls: z.array(z.string().url()).default([]),
  officialImageUrls: z.array(z.string().url()).default([]),
  requiredKeywords: z.array(z.string()).default([]),
  suspiciousTerms: z.array(z.string()).default([]),
  counterfeitTerms: z.array(z.string()).default([]),
  authorizedSellers: z.array(z.string()).default([]),
  packagingNotes: z.string().nullable().optional(),
  labelNotes: z.string().nullable().optional(),
  referenceImageNotes: z.string().nullable().optional(),
  category: z.string().default("skincare_cosmetics"),
  variant: z.string().nullable().optional(),
  sizeLabel: z.string().nullable().optional(),
  bpomNie: z.string().nullable().optional(),
  ingredientsHighlights: z.array(z.string()).default([]),
  packagingClaims: z.array(z.string()).default([]),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

export const insertListingSchema = z.object({
  productId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  currency: z.string().length(3).nullable().optional().default("IDR"),
  sellerName: z.string().nullable().optional(),
  marketplace: z.string().nullable().optional(),
  listingUrl: z.string().url().nullable().optional(),
  imageUrls: z.array(z.string()).default([]),
  screenshotUrl: z.string().nullable().optional(),
  sourceConfidence: z.number().min(0).max(1).default(0.6),
  rightsStatus: z.enum(["user_submitted", "public_search_result", "authorized_api", "manual_observation", "unknown"]).default("unknown"),
  limitations: z.array(z.string()).default([]),
  groundTruth: z.enum(["counterfeit", "legitimate", "likely_counterfeit", "gray_market_import", "expired_or_unsafe", "insufficient_evidence", "unknown"]).nullable().optional(),
  observedAt: z.string(),
  rawSource: z.unknown().nullable().optional(),
  sourceType: z.enum(["manual", "json_import", "csv_import", "search_api", "browser_capture", "marketplace_scrape"]),
});

export type InsertListing = z.infer<typeof insertListingSchema>;

export const linkListingProductSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
});

export type LinkListingProduct = z.infer<typeof linkListingProductSchema>;

export const insertReviewDecisionSchema = z.object({
  listingId: z.string().min(1),
  scoreId: z.string().min(1),
  status: z.enum(["pending", "confirmed_counterfeit", "likely_counterfeit", "rejected_legitimate", "gray_market_import", "expired_or_unsafe", "needs_more_evidence", "escalated"]).default("pending"),
  reviewer: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type InsertReviewDecision = z.infer<typeof insertReviewDecisionSchema>;

export const insertEvaluationCaseSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  sellerName: z.string().nullable().optional(),
  marketplace: z.string().nullable().optional(),
  listingUrl: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).default([]),
  observedAt: z.string(),
  groundTruth: z.enum(["counterfeit", "legitimate", "likely_counterfeit", "gray_market_import", "expired_or_unsafe", "insufficient_evidence", "unknown"]),
  notes: z.string().nullable().optional(),
});

export type InsertEvaluationCase = z.infer<typeof insertEvaluationCaseSchema>;

export const insertEvidenceSchema = z.object({
  listingId: z.string().min(1),
  evidenceType: z.string().min(1),
  fieldName: z.string().min(1),
  extractedValue: z.string(),
  rawValue: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;

export const ocrRequestSchema = z.object({
  listingId: z.string().min(1),
  imageUrl: z.string().min(1).optional(),
  forceMock: z.boolean().optional().default(false),
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;

export const regulatoryCheckRequestSchema = z.object({
  listingId: z.string().min(1),
  query: z.string().nullable().optional(),
  manualStatus: z.enum(["not_found", "match", "mismatch", "needs_manual_check", "not_available"]).nullable().optional(),
  matchedProductName: z.string().nullable().optional(),
  matchedBrandName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type RegulatoryCheckRequest = z.infer<typeof regulatoryCheckRequestSchema>;

export const visualCompareRequestSchema = z.object({
  listingId: z.string().min(1),
  suspectImageUrl: z.string().nullable().optional(),
  similarityScore: z.number().min(0).max(1).nullable().optional(),
  provider: z.enum(["mock", "siglip_adapter", "manual"]).default("mock"),
});

export type VisualCompareRequest = z.infer<typeof visualCompareRequestSchema>;

export const judgeRequestSchema = z.object({
  listingId: z.string().min(1),
  forceMock: z.boolean().optional().default(false),
});

export type JudgeRequest = z.infer<typeof judgeRequestSchema>;

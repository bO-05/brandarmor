import { z } from "zod";
import { buildInvestigationTrail, type InvestigationArtifactBundle } from "@/lib/investigation-trail";

const evidenceSchema = z.object({
  id: z.string(),
  evidenceType: z.string(),
  fieldName: z.string(),
  extractedValue: z.string(),
  confidence: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const reportListingSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  sellerName: z.string().nullable(),
  marketplace: z.string().nullable(),
  listingUrl: z.string().nullable(),
  imageUrls: z.array(z.string()),
  screenshotUrl: z.string().nullable(),
  sourceConfidence: z.number(),
  rightsStatus: z.string(),
  limitations: z.array(z.string()),
  observedAt: z.string(),
  sourceType: z.string(),
});

const reportBaselineSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  msrp: z.number().nullable(),
  msrpCurrency: z.string().nullable(),
  msrpMin: z.number().nullable(),
  msrpMax: z.number().nullable(),
  officialUrls: z.array(z.string()),
  officialImageUrls: z.array(z.string()),
  authorizedSellers: z.array(z.string()),
  packagingNotes: z.string().nullable(),
  referenceImageNotes: z.string().nullable(),
  bpomNie: z.string().nullable(),
});

export const caseReportSchema = z.object({
  reportVersion: z.literal("0.5.0"),
  generatedAt: z.string(),
  disclaimer: z.literal("Evidence prioritization for human review — not a legal determination of counterfeiting or authenticity."),
  claimBoundary: z.literal("BrandArmor routes suspicious marketplace listings for evidence-backed human review. It does not automatically confirm counterfeiting, authenticity, legal violations, or enforcement outcomes."),
  privacy: z.object({
    includedData: z.literal("User-provided and collected case data, plus internally generated evidence and report summaries"),
    excludedData: z.literal("No credentials, raw provider secrets, or reviewer identity; listing text, seller data, URLs, screenshots, and evidence notes may be personal or non-public"),
  }),
  listing: reportListingSchema,
  baseline: reportBaselineSchema.nullable(),
  evidence: z.array(evidenceSchema),
  ocr: z.object({
    provider: z.string(),
    model: z.string(),
    status: z.string(),
    averageConfidence: z.number().nullable(),
    parsedFields: z.object({
      bpomNie: z.string().nullable(),
      volumeOrSize: z.string().nullable(),
      expiryDate: z.string().nullable(),
      batchOrLot: z.string().nullable(),
      barcodeOrQrText: z.string().nullable(),
      ingredientsText: z.string().nullable(),
      claims: z.array(z.string()),
      brandMentions: z.array(z.string()),
      productMentions: z.array(z.string()),
    }),
    error: z.string().nullable(),
    createdAt: z.string(),
  }).nullable(),
  regulatory: z.object({
    provider: z.string(),
    query: z.string().nullable(),
    extractedNie: z.string().nullable(),
    expectedNie: z.string().nullable(),
    status: z.string(),
    matchedProductName: z.string().nullable(),
    matchedBrandName: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    notes: z.string().nullable(),
    bpomLookupDurationMs: z.number().nullable(),
    bpomStatus: z.string().nullable(),
    createdAt: z.string(),
  }).nullable(),
  visual: z.object({
    provider: z.string(),
    suspectImageUrl: z.string().nullable(),
    referenceImageUrls: z.array(z.string()),
    similarityScore: z.number().nullable(),
    status: z.string(),
    evidenceSummary: z.string(),
    createdAt: z.string(),
  }).nullable(),
  score: z.object({
    totalScore: z.number(),
    riskScore: z.number(),
    evidenceCompleteness: z.number().min(0).max(1),
    confidence: z.enum(["low", "medium", "high"]),
    riskLevel: z.string(),
    confidenceBand: z.string(),
    recommendedAction: z.string(),
    scoringVersion: z.string(),
    reasons: z.array(z.object({
      ruleId: z.string(),
      ruleName: z.string(),
      message: z.string(),
      points: z.number(),
      evidenceRefs: z.array(z.string()),
    })),
    createdAt: z.string(),
  }).nullable(),
  judge: z.object({
    provider: z.string(),
    model: z.string(),
    judgeRisk: z.string(),
    confidence: z.string(),
    supportedReasons: z.array(z.string()),
    contradictions: z.array(z.string()),
    missingEvidence: z.array(z.string()),
    recommendedNextAction: z.string(),
    citedEvidenceIds: z.array(z.string()),
    doNotClaimReasons: z.array(z.string()),
    error: z.string().nullable(),
    createdAt: z.string(),
  }).nullable(),
  review: z.object({
    status: z.string(),
    decidedAt: z.string(),
    updatedAt: z.string(),
  }).nullable(),
  investigation: z.object({
    status: z.string(),
    events: z.array(z.object({
      id: z.string(),
      type: z.string(),
      actor: z.string(),
      summary: z.string(),
      evidenceRefs: z.array(z.string()),
      at: z.string(),
    })),
    missingEvidence: z.array(z.string()),
    nextRecommendedActions: z.array(z.string()),
    doNotClaimReasons: z.array(z.string()),
  }),
  provenance: z.array(z.object({
    area: z.string(),
    mode: z.enum(["real", "mock", "roadmap"]),
    detail: z.string(),
  })),
});

export type CaseReport = z.infer<typeof caseReportSchema>;

const DISCLAIMER = "Evidence prioritization for human review — not a legal determination of counterfeiting or authenticity." as const;
const CLAIM_BOUNDARY = "BrandArmor routes suspicious marketplace listings for evidence-backed human review. It does not automatically confirm counterfeiting, authenticity, legal violations, or enforcement outcomes." as const;

type ReportProvenanceArea = "OCR" | "BPOM/NIE" | "Visual comparison" | "Evidence judge";

const verifiedProviders: Record<ReportProvenanceArea, readonly string[]> = {
  OCR: ["mistral"],
  "BPOM/NIE": ["bpom_api"],
  "Visual comparison": ["manual"],
  "Evidence judge": ["anthropic", "mistral"],
};

function modeFor(
  area: ReportProvenanceArea,
  provider: string | null | undefined,
  isUnavailable = false,
): "real" | "mock" | "roadmap" {
  if (isUnavailable || !provider) return "roadmap";
  if (verifiedProviders[area].includes(provider)) return "real";
  return "mock";
}

function reportConfidenceFor(score: NonNullable<InvestigationArtifactBundle["score"]>): "low" | "medium" | "high" {
  if (score.confidence) return score.confidence;
  if (score.confidenceBand === "low_evidence") return "low";
  if (score.confidenceBand === "strong") return "high";
  return "medium";
}

export function buildCaseReport(bundle: InvestigationArtifactBundle, generatedAt = new Date().toISOString()): CaseReport {
  const { listing, product, evidence, ocr, regulatory, visual, score, judge, review } = bundle;
  const investigation = buildInvestigationTrail(bundle);

  const report = {
    reportVersion: "0.5.0" as const,
    generatedAt,
    disclaimer: DISCLAIMER,
    claimBoundary: CLAIM_BOUNDARY,
    privacy: {
      includedData: "User-provided and collected case data, plus internally generated evidence and report summaries" as const,
      excludedData: "No credentials, raw provider secrets, or reviewer identity; listing text, seller data, URLs, screenshots, and evidence notes may be personal or non-public" as const,
    },
    listing: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      sellerName: listing.sellerName,
      marketplace: listing.marketplace,
      listingUrl: listing.listingUrl,
      imageUrls: listing.imageUrls,
      screenshotUrl: listing.screenshotUrl,
      sourceConfidence: listing.sourceConfidence,
      rightsStatus: listing.rightsStatus,
      limitations: listing.limitations,
      observedAt: listing.observedAt,
      sourceType: listing.sourceType,
    },
    baseline: product ? {
      id: product.id,
      brandId: product.brandId,
      name: product.name,
      sku: product.sku,
      msrp: product.msrp,
      msrpCurrency: product.msrpCurrency,
      msrpMin: product.msrpMin,
      msrpMax: product.msrpMax,
      officialUrls: product.officialUrls,
      officialImageUrls: product.officialImageUrls,
      authorizedSellers: product.authorizedSellers,
      packagingNotes: product.packagingNotes,
      referenceImageNotes: product.referenceImageNotes,
      bpomNie: product.bpomNie,
    } : null,
    evidence: evidence.map((item) => ({
      id: item.id,
      evidenceType: item.evidenceType,
      fieldName: item.fieldName,
      extractedValue: item.extractedValue,
      confidence: item.confidence,
      notes: item.notes,
      createdAt: item.createdAt,
    })),
    ocr: ocr ? {
      provider: ocr.provider,
      model: ocr.model,
      status: ocr.status,
      averageConfidence: ocr.averageConfidence,
      parsedFields: ocr.parsedFields,
      error: ocr.error,
      createdAt: ocr.createdAt,
    } : null,
    regulatory: regulatory ? {
      provider: regulatory.provider,
      query: regulatory.query,
      extractedNie: regulatory.extractedNie,
      expectedNie: regulatory.expectedNie,
      status: regulatory.status,
      matchedProductName: regulatory.matchedProductName,
      matchedBrandName: regulatory.matchedBrandName,
      sourceUrl: regulatory.sourceUrl,
      notes: regulatory.notes,
      bpomLookupDurationMs: regulatory.bpomLookupDurationMs ?? null,
      bpomStatus: regulatory.bpomStatus ?? null,
      createdAt: regulatory.createdAt,
    } : null,
    visual: visual ? {
      provider: visual.provider,
      suspectImageUrl: visual.suspectImageUrl,
      referenceImageUrls: visual.referenceImageUrls,
      similarityScore: visual.similarityScore,
      status: visual.status,
      evidenceSummary: visual.evidenceSummary,
      createdAt: visual.createdAt,
    } : null,
    score: score ? {
      totalScore: score.totalScore,
      riskScore: score.riskScore ?? score.totalScore,
      evidenceCompleteness: score.evidenceCompleteness ?? score.features.evidenceCompleteness,
      confidence: reportConfidenceFor(score),
      riskLevel: score.riskLevel,
      confidenceBand: score.confidenceBand,
      recommendedAction: score.recommendedAction,
      scoringVersion: score.scoringVersion,
      reasons: score.reasons,
      createdAt: score.createdAt,
    } : null,
    judge: judge ? {
      provider: judge.provider,
      model: judge.model,
      judgeRisk: judge.judgeRisk,
      confidence: judge.confidence,
      supportedReasons: judge.supportedReasons,
      contradictions: judge.contradictions,
      missingEvidence: judge.missingEvidence,
      recommendedNextAction: judge.recommendedNextAction,
      citedEvidenceIds: judge.citedEvidenceIds,
      doNotClaimReasons: judge.doNotClaimReasons,
      error: judge.error,
      createdAt: judge.createdAt,
    } : null,
    review: review ? {
      status: review.status,
      decidedAt: review.decidedAt,
      updatedAt: review.updatedAt,
    } : null,
    investigation: {
      status: investigation.context.status,
      events: investigation.run.events.map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        summary: event.summary,
        evidenceRefs: event.evidenceRefs,
        at: event.at,
      })),
      missingEvidence: investigation.context.missingEvidence,
      nextRecommendedActions: investigation.context.nextRecommendedActions,
      doNotClaimReasons: investigation.context.doNotClaimReasons,
    },
    provenance: [
      {
        area: "OCR",
        mode: modeFor("OCR", ocr?.provider, !ocr),
        detail: ocr ? `${ocr.provider} / ${ocr.model}` : "Not run",
      },
      {
        area: "BPOM/NIE",
        mode: modeFor("BPOM/NIE", regulatory?.provider, !regulatory),
        detail: regulatory ? `${regulatory.provider} / ${regulatory.status}` : "Not run",
      },
      {
        area: "Visual comparison",
        mode: modeFor("Visual comparison", visual?.provider, !visual || visual.status === "not_available"),
        detail: visual?.status === "not_available"
          ? "Roadmap-only for this case; no official and suspect image pair is available."
          : visual ? `${visual.provider} / ${visual.status}` : "Not run",
      },
      {
        area: "Evidence judge",
        mode: modeFor("Evidence judge", judge?.provider, !judge),
        detail: judge ? `${judge.provider} / ${judge.judgeRisk}` : "Not run",
      },
    ],
  };

  return caseReportSchema.parse(report);
}

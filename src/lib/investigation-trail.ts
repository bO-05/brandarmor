import {
  appendInvestigationEvent,
  buildInvestigationContextPack,
  createInvestigationRun,
  type InvestigationContextPack,
  type InvestigationEvent,
  type InvestigationEventType,
  type InvestigationRun,
} from "@/domain/investigation";
import type {
  Evidence,
  Listing,
  LlmJudgeAssessment,
  OcrArtifact,
  Product,
  RegulatoryCheck,
  ReviewDecision,
  Score,
  VisualMatchEvidence,
} from "@/domain/types";

export interface InvestigationArtifactBundle {
  listing: Listing;
  product: Product | null;
  evidence: Evidence[];
  ocr: OcrArtifact | null;
  regulatory: RegulatoryCheck | null;
  visual: VisualMatchEvidence | null;
  score: Score | null;
  judge: LlmJudgeAssessment | null;
  review: ReviewDecision | null;
}

export interface InvestigationTrail {
  run: InvestigationRun;
  context: InvestigationContextPack;
}

function sortedEvidenceIds(evidence: Evidence[]): string[] {
  return evidence.map((item) => item.id).sort();
}

function eventId(listingId: string, type: InvestigationEventType): string {
  return `projection_${listingId}_${type}`;
}

function append(
  run: InvestigationRun,
  listingId: string,
  type: InvestigationEventType,
  actor: InvestigationEvent["actor"],
  summary: string,
  evidenceRefs: string[],
  at: string,
  payload: unknown = null
): InvestigationRun {
  return appendInvestigationEvent(run, {
    id: eventId(listingId, type),
    type,
    actor,
    summary,
    evidenceRefs,
    now: at,
    payload,
  });
}

export function buildInvestigationTrail(bundle: InvestigationArtifactBundle): InvestigationTrail {
  const { listing, product, evidence, ocr, regulatory, visual, score, judge, review } = bundle;
  const listingEvidence = evidence.filter((item) => ["title", "description", "price", "seller", "listingUrl", "imageUrls", "screenshotUrl"].includes(item.fieldName));
  let run = createInvestigationRun({
    id: `projection_${listing.id}`,
    listingId: listing.id,
    productId: product?.id ?? null,
    goal: "Route marketplace evidence to human review without making an automatic counterfeit determination.",
    now: listing.createdAt,
  });

  run = append(
    run,
    listing.id,
    "listing_registered",
    "system",
    "Candidate listing was registered with source and provenance metadata.",
    sortedEvidenceIds(listingEvidence),
    listing.createdAt,
  );

  if (evidence.length > 0) {
    run = append(
      run,
      listing.id,
      "evidence_collected",
      "system",
      `${evidence.length} evidence record${evidence.length === 1 ? "" : "s"} are available for this case.`,
      sortedEvidenceIds(evidence),
      evidence[0]?.createdAt ?? listing.createdAt,
    );
  }

  if (ocr?.status === "completed") {
    run = append(
      run,
      listing.id,
      "ocr_completed",
      "integration",
      `${ocr.provider === "mock" ? "Demo OCR fixture" : "OCR"} completed with ${ocr.averageConfidence == null ? "unavailable" : `${Math.round(ocr.averageConfidence * 100)}%`} confidence.`,
      sortedEvidenceIds(evidence.filter((item) => item.fieldName.startsWith("ocr_") || item.evidenceType === "ocr_signal")),
      ocr.createdAt,
      { provider: ocr.provider, model: ocr.model },
    );
  } else if (ocr?.status === "failed") {
    run = append(
      run,
      listing.id,
      "error",
      "integration",
      "OCR did not complete; the case remains reviewable with the available evidence.",
      [],
      ocr.createdAt,
      { fatal: false, provider: ocr.provider },
    );
  }

  if (regulatory) {
    run = append(
      run,
      listing.id,
      "regulatory_checked",
      "integration",
      `BPOM/NIE check recorded as ${regulatory.status.replaceAll("_", " ")} via ${regulatory.provider}.`,
      sortedEvidenceIds(evidence.filter((item) => item.fieldName === "regulatory_status" || item.fieldName === "ocr_bpom_nie")),
      regulatory.createdAt,
      { provider: regulatory.provider, status: regulatory.status },
    );
  }

  if (visual) {
    const visualUnavailable = visual.status === "not_available";
    const visualSummary = visualUnavailable
      ? "Visual comparison is roadmap-only for this case because no inspectable reference pair is available."
      : `Visual comparison recorded as ${visual.status.replaceAll("_", " ")} via ${visual.provider}.`;
    run = append(
      run,
      listing.id,
      visualUnavailable ? "note" : "visual_compared",
      "integration",
      visualSummary,
      sortedEvidenceIds(evidence.filter((item) => item.fieldName === "visual_similarity")),
      visual.createdAt,
      { provider: visual.provider, status: visual.status },
    );
  }

  if (score) {
    run = append(
      run,
      listing.id,
      "score_computed",
      "system",
      `Deterministic routing score ${score.totalScore} recommends ${score.recommendedAction === "enforce" ? "internal escalation for approval" : score.recommendedAction}.`,
      Array.from(new Set(score.reasons.flatMap((reason) => reason.evidenceRefs))).sort(),
      score.createdAt,
      { totalScore: score.totalScore, recommendedAction: score.recommendedAction, confidenceBand: score.confidenceBand },
    );
  }

  if (judge) {
    run = append(
      run,
      listing.id,
      "judge_assessed",
      judge.provider === "mock" ? "system" : "integration",
      `${judge.provider === "mock" ? "Fallback evidence judge" : "Evidence judge"} returned ${judge.judgeRisk.replaceAll("_", " ")} with ${judge.citedEvidenceIds.length} cited evidence ID${judge.citedEvidenceIds.length === 1 ? "" : "s"}.`,
      judge.citedEvidenceIds,
      judge.createdAt,
      { provider: judge.provider, judgeRisk: judge.judgeRisk, confidence: judge.confidence },
    );
  }

  if (review?.status && review.status !== "pending") {
    run = append(
      run,
      listing.id,
      "human_reviewed",
      "human",
      `Internal human review label recorded as ${review.status.replaceAll("_", " ")}.`,
      [],
      review.updatedAt,
      { status: review.status },
    );
  } else {
    run = append(
      run,
      listing.id,
      "human_input_requested",
      "system",
      "Human review is required before any final authenticity, enforcement, or legal claim.",
      [],
      review?.updatedAt ?? score?.createdAt ?? listing.createdAt,
      { reason: "claim_safe_human_review" },
    );
  }

  return {
    run,
    context: buildInvestigationContextPack(run),
  };
}

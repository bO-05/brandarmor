import type {
  EvaluationMetrics,
  LlmJudgeAssessment,
  RecommendedAction,
  RegulatoryCheck,
  ReviewStatus,
  Score,
  VisualMatchEvidence,
} from "@/domain/types";

export type OperationState = "queued" | "running" | "completed" | "failed" | "skipped";

export type ListingWorkflowStepId =
  | "baseline"
  | "ocr"
  | "regulatory"
  | "visual"
  | "score"
  | "judge"
  | "review";

export interface ListingWorkflowInput {
  hasProductBaseline: boolean;
  hasOcr: boolean;
  hasRegulatory: boolean;
  hasVisual: boolean;
  hasScore: boolean;
  hasJudge: boolean;
  reviewStatus: ReviewStatus | null;
  runningStep?: ListingWorkflowStepId | null;
  failedStep?: ListingWorkflowStepId | null;
}

export interface ListingWorkflowStep {
  id: ListingWorkflowStepId;
  title: string;
  detail: string;
  state: OperationState;
}

export interface ReviewStatusPresentation {
  label: string;
  actionLabel: string;
  helpText: string;
  tone: "neutral" | "warning" | "success" | "danger";
}

export interface RecommendedActionPresentation {
  label: string;
  helpText: string;
}

export interface EvaluationSummary {
  best: EvaluationMetrics | null;
  f1: number;
  datasetLabel: string;
  limitNote: string;
  limitHeadline: string;
  limitTone: "neutral" | "warning" | "success";
  metricDisplayMode: "standard" | "guarded";
}

export interface ListingCaseBriefInput {
  hasProductBaseline: boolean;
  score: Score | null;
  evidenceCount: number;
  regulatoryStatus: RegulatoryCheck["status"] | null;
  visualStatus: VisualMatchEvidence["status"] | null;
  judge: LlmJudgeAssessment | null;
}

export interface ListingCaseBriefReason {
  title: string;
  detail: string;
  points: number;
}

export interface ListingCaseBriefStatus {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "success" | "danger";
}

export interface ListingCaseBrief {
  headline: string;
  summary: string;
  recommendedNextStep: string;
  topReasons: ListingCaseBriefReason[];
  missingEvidence: string[];
  evidenceStatus: ListingCaseBriefStatus[];
  tone: "neutral" | "warning" | "success" | "danger";
}

export interface ReviewRecommendation {
  status: ReviewStatus;
  label: string;
  actionLabel: string;
  reason: string;
  tone: ReviewStatusPresentation["tone"];
}

export type ReviewRecommendationScore = Pick<Score, "totalScore"> & Partial<Pick<Score, "confidenceBand" | "recommendedAction" | "riskLevel">>;

export interface ListingPrimaryActionInput {
  hasProductBaseline: boolean;
  loading: boolean;
}

export interface ListingPrimaryAction {
  label: string;
  disabled: boolean;
  reason: string;
}

export interface ReviewAlternativeOption extends ReviewStatusPresentation {
  status: ReviewStatus;
}

export interface ReviewConfirmationCopy {
  title: string;
  summary: string;
  safetyNote: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface DiagnosticEmptyState {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryActions: EmptyStateAction[];
}

export interface BaselineExplanation {
  title: string;
  summary: string;
  does: string[];
  doesNot: string[];
  nextStep: string;
  contextFields: string[];
}

export interface MediaPreviewInput {
  screenshotUrl: string | null;
  imageUrls: string[];
  listingLimitations: string[];
  sourceConfidence: number;
  visualStatus: VisualMatchEvidence["status"] | null;
  visualProvider: VisualMatchEvidence["provider"] | null;
  productOfficialImageUrls: string[];
  referenceImageNotes: string | null;
}

export interface MediaPreview {
  renderMode: "image" | "demo_placeholder" | "empty";
  primaryUrl: string | null;
  sourceUrl: string | null;
  sourceLabel: string;
  limitationText: string;
  visualStatusLabel: string;
  referenceLabel: string;
}

export interface ReviewNextStepAction {
  label: string;
  href: string;
  detail: string;
}

export type TermHelpKey =
  | "bpom_nie"
  | "routing_score"
  | "confidence_band"
  | "review_burden"
  | "f1"
  | "precision_at_k"
  | "source_confidence"
  | "pilot_label"
  | "visual_comparison";

export interface TermHelpDefinition {
  key: TermHelpKey;
  label: string;
  description: string;
  mobileHint: string;
}

export interface SidebarNavigationItem {
  href: string;
  label: string;
  badge?: string;
  badgeTone?: "neutral" | "warning" | "danger";
}

export interface SidebarNavigationGroup {
  id: "primary" | "setup";
  label: string;
  defaultOpen: boolean;
  items: SidebarNavigationItem[];
}

export interface AmbientStatusInput {
  listingCount: number;
  unlinkedListingCount: number;
  unscoredListingCount: number;
  pendingReviewCount: number;
  highRiskScoreCount: number;
  evaluationCaseCount: number;
  reviewDecisionCount: number;
  currentPath?: string;
}

export interface AmbientStatusItem {
  id: "baseline_gaps" | "score_gaps" | "pending_reviews" | "high_risk" | "pilot_dataset";
  label: string;
  detail: string;
  href: string;
  badge: string;
  tone: "neutral" | "warning" | "danger";
}

export interface AmbientStatus {
  headline: string;
  summary: string;
  nextActionLabel: string;
  nextActionHref: string;
  items: AmbientStatusItem[];
}

export interface ReviewQueueSummary {
  total: number;
  pending: number;
  labeled: number;
  headline: string;
  detail: string;
}

export interface EvaluationPlainLanguageSummary {
  headline: string;
  detail: string;
}

export interface ListingNextActionInput {
  hasProductBaseline: boolean;
  loading: boolean;
  score: Score | null;
  reviewStatus: ReviewStatus | null;
  judge: LlmJudgeAssessment | null;
  missingEvidenceCount: number;
}

export interface ListingNextAction {
  title: string;
  detail: string;
  primaryLabel: string;
  kind: "link_baseline" | "run_pipeline" | "review" | "below_threshold" | "collect_evidence" | "complete";
}

export const SAMPLE_LISTING_IMPORT_JSON = JSON.stringify([
  {
    productId: "replace-with-product-baseline-id",
    title: "Somethinc Calm Down Toner 100ml Original BPOM Murah",
    description: "Candidate listing captured for evidence-backed review.",
    price: 49000,
    sellerName: "skincare_diskon_88",
    marketplace: "shopee",
    listingUrl: "https://example.com/listing",
    screenshotUrl: "https://example.com/somethinc-calm-down-suspect.png",
    imageUrls: ["https://example.com/somethinc-calm-down-suspect.png"],
    sourceType: "json_import",
    observedAt: "2026-05-24T00:00:00.000Z"
  }
], null, 2);

export function resolveOperationState({
  running,
  failed,
  skipped,
  completed,
}: {
  running?: boolean;
  failed?: boolean;
  skipped?: boolean;
  completed?: boolean;
}): OperationState {
  if (running) return "running";
  if (failed) return "failed";
  if (skipped) return "skipped";
  if (completed) return "completed";
  return "queued";
}

function workflowState(
  id: ListingWorkflowStepId,
  input: ListingWorkflowInput,
  completed: boolean,
  skipped = false
): OperationState {
  return resolveOperationState({
    running: input.runningStep === id,
    failed: input.failedStep === id,
    skipped,
    completed,
  });
}

export function buildListingWorkflow(input: ListingWorkflowInput): ListingWorkflowStep[] {
  return [
    {
      id: "baseline",
      title: "Product baseline",
      detail: input.hasProductBaseline
        ? "Official product truth is linked to this listing."
        : "Link a product baseline before scoring evidence.",
      state: workflowState("baseline", input, input.hasProductBaseline),
    },
    {
      id: "ocr",
      title: "OCR extraction",
      detail: input.hasOcr
        ? "Packaging text evidence is stored."
        : "Run OCR on a listing image or screenshot.",
      state: workflowState("ocr", input, input.hasOcr),
    },
    {
      id: "regulatory",
      title: "BPOM/NIE check",
      detail: input.hasRegulatory
        ? "Regulatory evidence is available."
        : "Check extracted or expected registration evidence.",
      state: workflowState("regulatory", input, input.hasRegulatory),
    },
    {
      id: "visual",
      title: "Visual comparison",
      detail: input.hasVisual
        ? "Visual evidence status is recorded."
        : "Record adapter/mock visual evidence shape.",
      state: workflowState("visual", input, input.hasVisual),
    },
    {
      id: "score",
      title: "Routing score",
      detail: input.hasScore
        ? "Deterministic risk routing score is ready."
        : "Compute a transparent score from available evidence.",
      state: workflowState("score", input, input.hasScore),
    },
    {
      id: "judge",
      title: "Evidence judge",
      detail: input.hasJudge
        ? "Judge assessment cites or rejects evidence."
        : "Ask the judge to reason over cited evidence only.",
      state: workflowState("judge", input, input.hasJudge),
    },
    {
      id: "review",
      title: "Human review",
      detail: input.reviewStatus
        ? `Internal reviewer label is ${input.reviewStatus.replaceAll("_", " ")}.`
        : "No internal reviewer label yet.",
      state: workflowState(
        "review",
        input,
        Boolean(input.reviewStatus && input.reviewStatus !== "pending"),
        input.reviewStatus == null
      ) === "skipped"
        ? "queued"
        : input.reviewStatus === "pending"
          ? "running"
          : workflowState("review", input, Boolean(input.reviewStatus))
    },
  ];
}

export function getReviewStatusPresentation(status: ReviewStatus): ReviewStatusPresentation {
  const copy: Record<ReviewStatus, ReviewStatusPresentation> = {
    pending: {
      label: "Awaiting internal review",
      actionLabel: "Keep pending",
      helpText: "The evidence bundle is ready for a human reviewer.",
      tone: "warning",
    },
    confirmed_counterfeit: {
      label: "Confirmed risk by reviewer",
      actionLabel: "Mark confirmed risk",
      helpText: "internal reviewer label only; it does not create an external submission or enforcement action.",
      tone: "danger",
    },
    likely_counterfeit: {
      label: "Likely risk",
      actionLabel: "Mark likely risk",
      helpText: "Internal reviewer label for suspicious evidence that still needs careful handling.",
      tone: "danger",
    },
    rejected_legitimate: {
      label: "Likely legitimate",
      actionLabel: "Mark likely legitimate",
      helpText: "Internal reviewer label that the routed evidence does not support escalation.",
      tone: "success",
    },
    gray_market_import: {
      label: "Gray-market/import signal",
      actionLabel: "Mark gray-market/import",
      helpText: "Internal reviewer label for non-authorized or parallel import signals.",
      tone: "neutral",
    },
    expired_or_unsafe: {
      label: "Expired or unsafe signal",
      actionLabel: "Mark expired/unsafe",
      helpText: "Internal reviewer label for safety or expiry concerns visible in evidence.",
      tone: "danger",
    },
    needs_more_evidence: {
      label: "Needs more evidence",
      actionLabel: "Request more evidence",
      helpText: "Pause the case until stronger OCR, regulatory, visual, or source evidence is available.",
      tone: "warning",
    },
    escalated: {
      label: "Internal escalation",
      actionLabel: "Escalate internally",
      helpText: "Internal escalation only; external actions still require explicit human approval.",
      tone: "danger",
    },
  };
  return copy[status];
}

export function getRecommendedActionPresentation(action: RecommendedAction): RecommendedActionPresentation {
  const copy: Record<RecommendedAction, RecommendedActionPresentation> = {
    ignore: {
      label: "No review needed",
      helpText: "Available evidence does not currently justify reviewer attention.",
    },
    watch: {
      label: "Watch",
      helpText: "Keep the case visible while more evidence is collected.",
    },
    review: {
      label: "Route to review",
      helpText: "Send the evidence bundle to a human reviewer.",
    },
    enforce: {
      label: "Escalate for approval",
      helpText: "High-stakes follow-up still requires explicit human approval.",
    },
  };
  return copy[action];
}

function statusTone(value: string | null): ListingCaseBriefStatus["tone"] {
  if (!value || value === "not_available" || value === "needs_manual_check" || value === "inconclusive") return "warning";
  if (value === "match" || value === "verified_active") return "success";
  if (value === "mismatch" || value === "not_found" || value === "verified_expired" || value === "brand_mismatch") return "danger";
  return "neutral";
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.flatMap((value) => {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  })));
}

export function buildListingCaseBrief(input: ListingCaseBriefInput): ListingCaseBrief {
  const topReasons = input.score?.reasons.slice(0, 3).map((reason) => ({
    title: reason.ruleName,
    detail: reason.message,
    points: reason.points,
  })) ?? [];

  const missingEvidence = dedupe([
    ...(!input.hasProductBaseline ? ["Product baseline"] : []),
    ...(input.evidenceCount === 0 ? ["Stored listing evidence"] : []),
    ...(!input.regulatoryStatus || input.regulatoryStatus === "not_available" ? ["BPOM/NIE check"] : []),
    ...(!input.visualStatus || input.visualStatus === "not_available" ? ["Visual comparison"] : []),
    ...(input.judge?.missingEvidence ?? []),
    ...(input.judge && input.judge.citedEvidenceIds.length === 0 ? ["Judge-cited evidence IDs"] : []),
  ]);

  const evidenceStatus: ListingCaseBriefStatus[] = [
    {
      label: "Product baseline",
      value: input.hasProductBaseline ? "linked" : "not linked",
      tone: input.hasProductBaseline ? "success" : "warning",
    },
    {
      label: "Stored evidence",
      value: input.evidenceCount > 0 ? `${input.evidenceCount} records` : "none yet",
      tone: input.evidenceCount > 0 ? "success" : "warning",
    },
    {
      label: "BPOM/NIE",
      value: input.regulatoryStatus?.replaceAll("_", " ") ?? "not run",
      tone: statusTone(input.regulatoryStatus),
    },
    {
      label: "Visual",
      value: input.visualStatus?.replaceAll("_", " ") ?? "not run",
      tone: statusTone(input.visualStatus),
    },
    {
      label: "Judge",
      value: input.judge ? input.judge.judgeRisk.replaceAll("_", " ") : "not run",
      tone: input.judge?.judgeRisk === "insufficient_evidence" ? "warning" : input.judge ? statusTone(input.judge.judgeRisk) : "warning",
    },
  ];

  if (!input.hasProductBaseline || !input.score) {
    return {
      headline: "Evidence review has not started",
      summary: "Link a product baseline and run the recommended pipeline before treating this listing as ready for review.",
      recommendedNextStep: input.hasProductBaseline ? "Run the recommended evidence pipeline." : "Link a product baseline on this page.",
      topReasons,
      missingEvidence,
      evidenceStatus,
      tone: "warning",
    };
  }

  if (input.judge?.judgeRisk === "insufficient_evidence") {
    return {
      headline: "More evidence is needed before review confidence improves",
      summary: "The score is directional, but the judge could not cite enough evidence for a stronger reviewer assessment.",
      recommendedNextStep: "Collect the missing evidence before applying a stronger internal label.",
      topReasons,
      missingEvidence,
      evidenceStatus,
      tone: "warning",
    };
  }

  const action = getRecommendedActionPresentation(input.score.recommendedAction);
  const shouldReview = input.score.recommendedAction === "review" || input.score.recommendedAction === "enforce" || input.score.totalScore >= 50;
  const shouldWatch = input.score.recommendedAction === "watch" || input.score.totalScore >= 20;

  return {
    headline: shouldReview
      ? "Route this listing to human review first"
      : shouldWatch
        ? "Keep this listing visible while evidence improves"
        : "Available evidence does not currently need priority review",
    summary: `Score ${input.score.totalScore} is an advisory routing signal, not a counterfeit conclusion. ${action.helpText}`,
    recommendedNextStep: input.score.recommendedAction === "enforce"
      ? "Escalate internally for approval before any high-stakes follow-up."
      : action.helpText,
    topReasons,
    missingEvidence,
    evidenceStatus,
    tone: shouldReview ? "danger" : shouldWatch ? "warning" : "success",
  };
}

export function selectReviewRecommendation(score: ReviewRecommendationScore | null): ReviewRecommendation {
  const recommendedAction = score?.recommendedAction ?? (score && score.totalScore >= 50 ? "review" : score && score.totalScore >= 20 ? "watch" : "ignore");
  const status: ReviewStatus = !score
    ? "needs_more_evidence"
    : score.confidenceBand === "low_evidence"
      ? "needs_more_evidence"
      : score.totalScore < 20 || recommendedAction === "ignore"
        ? "rejected_legitimate"
        : score.totalScore >= 50 || recommendedAction === "review" || recommendedAction === "enforce"
          ? "likely_counterfeit"
          : "needs_more_evidence";

  const presentation = getReviewStatusPresentation(status);
  const reason = status === "likely_counterfeit"
    ? "Score suggests this evidence bundle should receive human review before any stronger label."
    : status === "rejected_legitimate"
      ? "The current score is low; mark likely legitimate only if the evidence supports no further escalation."
      : score?.confidenceBand === "low_evidence"
        ? "The score is high enough to inspect, but confidence is low evidence; collect stronger proof first."
        : "The available evidence is not strong enough for a risk label yet.";

  return {
    status,
    label: presentation.label,
    actionLabel: presentation.actionLabel,
    reason,
    tone: presentation.tone,
  };
}

export function getReviewConfirmation(status: ReviewStatus): ReviewConfirmationCopy {
  const presentation = getReviewStatusPresentation(status);

  return {
    title: "Confirm internal review label",
    summary: `Save "${presentation.label}" as the internal reviewer label for this evidence bundle. This records review workflow state only.`,
    safetyNote: "No external report, seller contact, marketplace submission, enforcement action, or legal conclusion will be triggered.",
    confirmLabel: "Save internal label",
    cancelLabel: "Keep editing",
  };
}

export function getListingPrimaryAction(input: ListingPrimaryActionInput): ListingPrimaryAction {
  if (!input.hasProductBaseline) {
    return {
      label: "Link baseline first",
      disabled: true,
      reason: "A product baseline is required before the OCR, BPOM/NIE, visual, score, and judge pipeline can run.",
    };
  }

  return {
    label: input.loading ? "Running pipeline..." : "Run recommended pipeline",
    disabled: input.loading,
    reason: "Runs OCR, BPOM/NIE, visual comparison, routing score, and evidence judge in the recommended order.",
  };
}

export function getListingNextAction(input: ListingNextActionInput): ListingNextAction {
  if (!input.hasProductBaseline) {
    return {
      title: "Link official product truth first",
      detail: "Choose the matching product baseline before OCR, BPOM/NIE, visual comparison, scoring, and judge assessment can run.",
      primaryLabel: "Link baseline",
      kind: "link_baseline",
    };
  }

  if (!input.score) {
    return {
      title: "Run the evidence path",
      detail: input.loading
        ? "The recommended evidence pipeline is running."
        : "Run OCR, BPOM/NIE, visual comparison, routing score, and judge assessment in the recommended order.",
      primaryLabel: input.loading ? "Running pipeline..." : "Run recommended pipeline",
      kind: "run_pipeline",
    };
  }

  if (input.reviewStatus === "pending") {
    return {
      title: "Apply the internal review label",
      detail: "A review item exists for this evidence bundle. Save an internal label after checking the case brief and cited evidence.",
      primaryLabel: "Review this case",
      kind: "review",
    };
  }

  if (input.reviewStatus) {
    return {
      title: "Internal review label saved",
      detail: "This case has an internal reviewer label. No external report, seller contact, or enforcement action was triggered.",
      primaryLabel: "View saved label",
      kind: "complete",
    };
  }

  if (input.score.recommendedAction === "ignore" || input.score.totalScore < 20) {
    return {
      title: "No review item was created",
      detail: "The score is below the routing threshold for reviewer attention. Scores are advisory and can be rerun if stronger evidence is added.",
      primaryLabel: "Evidence path complete",
      kind: "below_threshold",
    };
  }

  if (input.judge?.judgeRisk === "insufficient_evidence" || input.missingEvidenceCount > 0) {
    return {
      title: "Collect missing evidence before a stronger label",
      detail: "The case has a score, but the evidence bundle still has gaps. Review missing evidence before applying a stronger internal label.",
      primaryLabel: "View missing evidence",
      kind: "collect_evidence",
    };
  }

  return {
    title: "Evidence path is ready",
    detail: "The evidence bundle is ready to inspect. If a review item is absent, rerun the pipeline or open the review queue to confirm current state.",
    primaryLabel: "Inspect evidence",
    kind: "collect_evidence",
  };
}

export function getBaselineExplanation(): BaselineExplanation {
  return {
    title: "Official product truth used for comparison",
    summary: "BrandArmor compares this listing against the selected product baseline so OCR, BPOM/NIE, pricing, seller, and packaging evidence have a reference point.",
    nextStep: "Choose the matching product baseline, confirm the expected product context, then run the recommended evidence pipeline.",
    contextFields: ["Product name", "BPOM/NIE", "Expected price", "Authorized sellers"],
    does: [
      "Adds the expected product, seller, BPOM/NIE, price, and packaging context to this review.",
      "Lets the evidence pipeline compute a clearer routing score and judge assessment.",
    ],
    doesNot: [
      "Does not edit the marketplace listing or prove the listing is counterfeit.",
      "Does not submit reports, contact sellers, or trigger enforcement.",
    ],
  };
}

export function selectAmbientStatus(input: AmbientStatusInput): AmbientStatus {
  const items: AmbientStatusItem[] = [];

  if (input.unlinkedListingCount > 0) {
    items.push({
      id: "baseline_gaps",
      label: `${input.unlinkedListingCount} listing${input.unlinkedListingCount === 1 ? "" : "s"} need baseline links`,
      detail: "Link official product truth before running the evidence path.",
      href: "/listings",
      badge: String(input.unlinkedListingCount),
      tone: "warning",
    });
  }

  if (input.unscoredListingCount > 0) {
    items.push({
      id: "score_gaps",
      label: `${input.unscoredListingCount} listing${input.unscoredListingCount === 1 ? "" : "s"} need evidence scores`,
      detail: "Run the recommended pipeline so cases can be routed for review.",
      href: "/listings",
      badge: String(input.unscoredListingCount),
      tone: "warning",
    });
  }

  if (input.pendingReviewCount > 0) {
    items.push({
      id: "pending_reviews",
      label: `${input.pendingReviewCount} internal review label${input.pendingReviewCount === 1 ? "" : "s"} waiting`,
      detail: "Apply human review labels inside the claim-safe workflow.",
      href: "/review",
      badge: String(input.pendingReviewCount),
      tone: input.highRiskScoreCount > 0 ? "danger" : "warning",
    });
  }

  if (input.highRiskScoreCount > 0 && input.pendingReviewCount === 0) {
    items.push({
      id: "high_risk",
      label: `${input.highRiskScoreCount} high-risk routing signal${input.highRiskScoreCount === 1 ? "" : "s"}`,
      detail: "Scores prioritize reviewer attention; they are not authenticity decisions.",
      href: "/listings",
      badge: String(input.highRiskScoreCount),
      tone: "danger",
    });
  }

  if (input.evaluationCaseCount < 200) {
    items.push({
      id: "pilot_dataset",
      label: "Pilot dataset below roadmap floor",
      detail: `${input.evaluationCaseCount} labeled cases; expand toward 200 before operational accuracy claims.`,
      href: "/evaluation",
      badge: "pilot",
      tone: "warning",
    });
  }

  if (input.listingCount === 0) {
    return {
      headline: "Start with one guided evidence review",
      summary: "Run the guided demo to see the baseline, evidence, score, judge, review, and evaluation path.",
      nextActionLabel: "Run guided demo",
      nextActionHref: "/demo",
      items,
    };
  }

  if (input.unscoredListingCount > 0) {
    return {
      headline: `${input.unscoredListingCount} listing${input.unscoredListingCount === 1 ? "" : "s"} still need evidence scores`,
      summary: "BrandArmor can show what needs attention next before a reviewer opens each case.",
      nextActionLabel: "Open listings",
      nextActionHref: "/listings",
      items,
    };
  }

  if (input.unlinkedListingCount > 0) {
    return {
      headline: `${input.unlinkedListingCount} listing${input.unlinkedListingCount === 1 ? "" : "s"} need baseline links`,
      summary: "BrandArmor can show what needs attention next before a reviewer opens each case.",
      nextActionLabel: "Open listings",
      nextActionHref: "/listings",
      items,
    };
  }

  if (input.pendingReviewCount > 0) {
    return {
      headline: `${input.pendingReviewCount} internal review label${input.pendingReviewCount === 1 ? "" : "s"} waiting`,
      summary: "Evidence bundles are ready for human review; labels remain internal workflow state.",
      nextActionLabel: "Open review queue",
      nextActionHref: "/review",
      items,
    };
  }

  return {
    headline: input.reviewDecisionCount > 0 ? "Review evaluation with pilot limits" : "Evidence path is ready for review setup",
    summary: "Use evaluation to inspect pilot routing behavior; current metrics do not prove production accuracy.",
    nextActionLabel: "View evaluation",
    nextActionHref: "/evaluation",
    items,
  };
}

function firstMediaUrl(input: Pick<MediaPreviewInput, "screenshotUrl" | "imageUrls">): string | null {
  return input.screenshotUrl ?? input.imageUrls.find(Boolean) ?? null;
}

function isDemoPlaceholderUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === "example.com";
  } catch {
    return url.includes("example.com");
  }
}

export function buildMediaPreview(input: MediaPreviewInput): MediaPreview {
  const sourceUrl = firstMediaUrl(input);
  const isPlaceholder = isDemoPlaceholderUrl(sourceUrl);
  const sourceConfidence = `${Math.round(input.sourceConfidence * 100)}% source confidence`;
  const visualStatus = input.visualStatus
    ? `${input.visualProvider ?? "visual"}: ${input.visualStatus.replaceAll("_", " ")}`
    : "Visual comparison not run";
  const referenceCount = input.productOfficialImageUrls.length;
  const referenceLabel = referenceCount > 0
    ? `${referenceCount} official reference image${referenceCount === 1 ? "" : "s"} recorded`
    : input.referenceImageNotes
      ? "Official reference notes recorded"
      : "No official reference image recorded";

  if (!sourceUrl) {
    return {
      renderMode: "empty",
      primaryUrl: null,
      sourceUrl: null,
      sourceLabel: `No listing image available / ${sourceConfidence}`,
      limitationText: input.listingLimitations.length
        ? input.listingLimitations.join(", ")
        : "Add a listing image or screenshot URL to make OCR and visual review easier.",
      visualStatusLabel: visualStatus,
      referenceLabel,
    };
  }

  if (isPlaceholder) {
    return {
      renderMode: "demo_placeholder",
      primaryUrl: null,
      sourceUrl,
      sourceLabel: `demo placeholder / ${sourceConfidence}`,
      limitationText: [
        "Demo visual placeholder is shown because the stored URL is not a real inspectable marketplace image.",
        ...input.listingLimitations,
      ].join(" "),
      visualStatusLabel: visualStatus,
      referenceLabel,
    };
  }

  return {
    renderMode: "image",
    primaryUrl: sourceUrl,
    sourceUrl,
    sourceLabel: `Listing media / ${sourceConfidence}`,
    limitationText: input.listingLimitations.length
      ? input.listingLimitations.join(", ")
      : "Visual display uses the stored listing media URL; image comparison remains advisory evidence.",
    visualStatusLabel: visualStatus,
    referenceLabel,
  };
}

export function getReviewNextStepActions(listingId: string, status: ReviewStatus): ReviewNextStepAction[] {
  if (status === "needs_more_evidence") {
    return [
      {
        label: "Open listing to collect evidence",
        href: `/listings/${listingId}`,
        detail: "Return to the case workspace and rerun or add missing evidence.",
      },
      {
        label: "Review next case",
        href: "/review",
        detail: "Continue through the internal review queue.",
      },
      {
        label: "View evaluation",
        href: "/evaluation",
        detail: "Check how routing choices affect the pilot metrics.",
      },
    ];
  }

  return [
    {
      label: "Review next case",
      href: "/review",
      detail: "Continue through the internal review queue.",
    },
    {
      label: "Open listing workspace",
      href: `/listings/${listingId}`,
      detail: "Inspect the evidence bundle behind this label.",
    },
    {
      label: "View evaluation",
      href: "/evaluation",
      detail: "Check how routing choices affect the pilot metrics.",
    },
  ];
}

export function summarizeReviewQueue(statuses: ReviewStatus[]): ReviewQueueSummary {
  const pending = statuses.filter((status) => status === "pending").length;
  const total = statuses.length;
  const labeled = total - pending;

  return {
    total,
    pending,
    labeled,
    headline: `${total} item${total === 1 ? "" : "s"} / ${pending} pending / ${labeled} labeled`,
    detail: total === 0
      ? "No internal review items are available yet."
      : "This is the current internal review queue. Labels remain workflow state and do not trigger external action.",
  };
}

export function selectReviewAlternativeOptions(suggestedStatus: ReviewStatus): ReviewAlternativeOption[] {
  const statuses: ReviewStatus[] = [
    "confirmed_counterfeit",
    "likely_counterfeit",
    "rejected_legitimate",
    "gray_market_import",
    "expired_or_unsafe",
    "needs_more_evidence",
    "escalated",
  ];

  return statuses.flatMap((status) => (
    status === suggestedStatus ? [] : [{ status, ...getReviewStatusPresentation(status) }]
  ));
}

export function getReviewQueueEmptyState({
  listingCount,
  scoreCount,
}: {
  listingCount: number;
  scoreCount: number;
}): DiagnosticEmptyState {
  if (listingCount === 0) {
    return {
      title: "No candidate listings yet",
      body: "Run the guided demo to seed one complete evidence review, or add/import a listing once a product baseline exists.",
      primaryLabel: "Run Guided Demo",
      primaryHref: "/demo",
      secondaryActions: [
        { label: "Add Listing", href: "/listings/new" },
        { label: "Import Listings", href: "/listings/import" },
      ],
    };
  }

  if (scoreCount === 0) {
    return {
      title: "Listings need evidence scores first",
      body: "Open a listing, link a product baseline if needed, and run the recommended evidence pipeline before cases can enter review.",
      primaryLabel: "Open Listings",
      primaryHref: "/listings",
      secondaryActions: [
        { label: "Run Guided Demo", href: "/demo" },
        { label: "Import Listings", href: "/listings/import" },
      ],
    };
  }

  return {
    title: "No review decisions queued",
    body: "Listings and scores exist, but no pending review item is available. Open a listing workspace and run the pipeline or inspect existing labels.",
    primaryLabel: "Open Listings",
    primaryHref: "/listings",
    secondaryActions: [
      { label: "Run Guided Demo", href: "/demo" },
      { label: "Add Listing", href: "/listings/new" },
    ],
  };
}

export function getEvaluationEmptyState({
  listingCount,
  reviewDecisionCount,
}: {
  listingCount: number;
  reviewDecisionCount: number;
}): DiagnosticEmptyState {
  if (listingCount === 0) {
    return {
      title: "No listings available for evaluation",
      body: "Run the guided demo or add/import listings before computing pilot threshold behavior.",
      primaryLabel: "Run Guided Demo",
      primaryHref: "/demo",
      secondaryActions: [
        { label: "Add Listing", href: "/listings/new" },
        { label: "Import Listings", href: "/listings/import" },
      ],
    };
  }

  if (reviewDecisionCount === 0) {
    return {
      title: "No internal review labels yet",
      body: "Evaluation needs reviewer labels before precision, recall, and review burden can be interpreted.",
      primaryLabel: "Open Review Queue",
      primaryHref: "/review",
      secondaryActions: [
        { label: "Open Listings", href: "/listings" },
        { label: "Run Guided Demo", href: "/demo" },
      ],
    };
  }

  return {
    title: "No evaluation metrics yet",
    body: "Review labels exist, but metrics were not returned. Recompute evaluation or check local JSON persistence if the backend reported an error.",
    primaryLabel: "Recompute Evaluation",
    primaryHref: "/evaluation",
    secondaryActions: [
      { label: "Open Review Queue", href: "/review" },
      { label: "Open Listings", href: "/listings" },
    ],
  };
}

const TERM_GLOSSARY: Record<TermHelpKey, TermHelpDefinition> = {
  bpom_nie: {
    key: "bpom_nie",
    label: "BPOM/NIE",
    description: "Indonesian cosmetics registration evidence. It helps reviewers compare listing claims with expected product records.",
    mobileHint: "Tap or focus the help icon to read the BPOM/NIE definition.",
  },
  routing_score: {
    key: "routing_score",
    label: "Routing score",
    description: "A prioritization score for review. It is not an authenticity decision or legal conclusion.",
    mobileHint: "Tap or focus the help icon to read how the routing score should be used.",
  },
  confidence_band: {
    key: "confidence_band",
    label: "Confidence band",
    description: "A shorthand for how complete the available evidence is for reviewer use.",
    mobileHint: "Tap or focus the help icon to read how evidence completeness affects confidence.",
  },
  review_burden: {
    key: "review_burden",
    label: "Review burden",
    description: "The share of pilot cases a human reviewer would need to inspect at a threshold.",
    mobileHint: "Tap or focus the help icon to read what review burden measures.",
  },
  f1: {
    key: "f1",
    label: "F1",
    description: "A pilot metric balancing precision and recall. It does not prove production accuracy.",
    mobileHint: "Tap or focus the help icon to read how F1 balances pilot metrics.",
  },
  precision_at_k: {
    key: "precision_at_k",
    label: "P@K",
    description: "Precision among the top-ranked pilot cases. It helps compare routing quality for reviewer queues.",
    mobileHint: "Tap or focus the help icon to read what P@K means for queue quality.",
  },
  source_confidence: {
    key: "source_confidence",
    label: "Source confidence",
    description: "A reviewer-facing estimate of how reliable the captured listing source is. It is not proof that the listing is accurate or complete.",
    mobileHint: "Tap or focus the help icon to read how source confidence should be interpreted.",
  },
  pilot_label: {
    key: "pilot_label",
    label: "Pilot label",
    description: "A local evaluation fixture label used for demo metrics. It is not a marketplace decision or automatic authenticity claim.",
    mobileHint: "Tap or focus the help icon to read why pilot labels are separate from review decisions.",
  },
  visual_comparison: {
    key: "visual_comparison",
    label: "Visual comparison",
    description: "adapter/mock visual evidence that records comparison status without claiming production image retrieval or counterfeit proof.",
    mobileHint: "Tap or focus the help icon to read the current visual comparison limit.",
  },
};

export function getTermHelp(key: TermHelpKey): TermHelpDefinition {
  return TERM_GLOSSARY[key];
}

export function getSidebarNavigationGroups(): SidebarNavigationGroup[] {
  return [
    {
      id: "primary",
      label: "Review path",
      defaultOpen: true,
      items: [
        { href: "/", label: "Start" },
        { href: "/demo", label: "Run Demo" },
        { href: "/listings", label: "Listings" },
        { href: "/review", label: "Review Queue" },
        { href: "/evaluation", label: "Evaluation" },
      ],
    },
    {
      id: "setup",
      label: "Setup and sources",
      defaultOpen: false,
      items: [
        { href: "/brands", label: "Brands" },
        { href: "/discovery", label: "Discovery" },
      ],
    },
  ];
}

export function decorateSidebarNavigationGroups(
  groups: SidebarNavigationGroup[],
  status: AmbientStatusInput
): SidebarNavigationGroup[] {
  const listingBadge = status.unlinkedListingCount + status.unscoredListingCount;
  const evaluationNeedsAttention = status.evaluationCaseCount < 200 || (status.listingCount > 0 && status.reviewDecisionCount === 0);

  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.href === "/listings" && listingBadge > 0) {
        return { ...item, badge: String(listingBadge), badgeTone: "warning" };
      }
      if (item.href === "/review" && status.pendingReviewCount > 0) {
        return {
          ...item,
          badge: String(status.pendingReviewCount),
          badgeTone: status.highRiskScoreCount > 0 ? "danger" : "warning",
        };
      }
      if (item.href === "/evaluation" && evaluationNeedsAttention) {
        return { ...item, badge: status.evaluationCaseCount < 200 ? "pilot" : "label", badgeTone: "warning" };
      }
      return item;
    }),
  }));
}

export function f1Score(metric: Pick<EvaluationMetrics, "precision" | "recall">): number {
  if (metric.precision + metric.recall === 0) return 0;
  return (2 * metric.precision * metric.recall) / (metric.precision + metric.recall);
}

export function selectEvaluationSummary({
  cases,
  metrics,
}: {
  cases: number;
  metrics: EvaluationMetrics[];
}): EvaluationSummary {
  const best = metrics.reduce<EvaluationMetrics | null>((current, candidate) => {
    if (!current) return candidate;
    const currentF1 = f1Score(current);
    const candidateF1 = f1Score(candidate);
    if (candidateF1 > currentF1) return candidate;
    if (candidateF1 === currentF1 && candidate.reviewBurden < current.reviewBurden) return candidate;
    return current;
  }, null);

  const meetsRoadmapFloor = cases >= 200;

  return {
    best,
    f1: best ? f1Score(best) : 0,
    datasetLabel: cases > 0 ? `${cases} labeled pilot cases` : "No labeled cases yet",
    limitHeadline: meetsRoadmapFloor
      ? "Dataset size meets roadmap floor"
      : "Pilot only: dataset below roadmap floor",
    limitTone: meetsRoadmapFloor ? "success" : "warning",
    metricDisplayMode: meetsRoadmapFloor ? "standard" : "guarded",
    limitNote: meetsRoadmapFloor
      ? "Dataset size meets the current roadmap floor for stronger operational analysis."
      : "Treat this as a pilot dataset; expand toward 200 labeled cases before operational accuracy claims.",
  };
}

export function selectEvaluationPlainLanguageSummary(summary: EvaluationSummary): EvaluationPlainLanguageSummary {
  if (!summary.best) {
    return {
      headline: "No threshold readout is available yet.",
      detail: "Compute evaluation after review labels exist to estimate reviewer workload and routing usefulness.",
    };
  }

  const reviewPercent = Math.round(summary.best.reviewBurden * 100);
  const usefulPercent = Math.round(summary.best.precision * 100);
  return {
    headline: `At the current pilot setting, reviewers would inspect ${reviewPercent}% of listings.`,
    detail: `${usefulPercent}% of reviewed pilot listings matched suspicious or unsafe labels. ${summary.limitNote}`,
  };
}

export function getListingSourceTypeLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    manual: "Manual entry",
    json_import: "JSON import",
    csv_import: "CSV import",
    search_api: "Search lead",
    browser_capture: "Browser capture",
    marketplace_scrape: "Marketplace capture",
  };
  return labels[sourceType] ?? sourceType.replaceAll("_", " ");
}

export function getPilotLabelPresentation(label: string | null | undefined): string {
  const labels: Record<string, string> = {
    counterfeit: "Confirmed risk fixture",
    likely_counterfeit: "Likely risk fixture",
    legitimate: "Likely legitimate fixture",
    rejected_legitimate: "Likely legitimate fixture",
    gray_market_import: "Gray-market/import fixture",
    expired_or_unsafe: "Expired or unsafe fixture",
    needs_more_evidence: "Needs more evidence fixture",
  };
  return label ? labels[label] ?? label.replaceAll("_", " ") : "Unlabeled";
}

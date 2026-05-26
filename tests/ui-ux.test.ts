import { describe, expect, it } from "vitest";
import type { EvaluationMetrics, LlmJudgeAssessment, Score } from "../src/domain/types";
import {
  buildListingWorkflow,
  buildMediaPreview,
  getBaselineExplanation,
  getListingNextAction,
  getRecommendedActionPresentation,
  getReviewStatusPresentation,
  getReviewNextStepActions,
  resolveOperationState,
  selectAmbientStatus,
  selectEvaluationSummary,
  selectEvaluationPlainLanguageSummary,
  summarizeReviewQueue,
} from "../src/lib/ui-ux";
import * as uiUx from "../src/lib/ui-ux";

function metric(overrides: Partial<EvaluationMetrics>): EvaluationMetrics {
  return {
    threshold: 50,
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
    precision: 0,
    recall: 0,
    falsePositiveRate: 0,
    falseNegativeRate: 0,
    accuracy: 0,
    precisionAtK: 0,
    reviewBurden: 0,
    totalCases: 0,
    ...overrides,
  };
}

function score(overrides: Partial<Score>): Score {
  return {
    id: "score-1",
    listingId: "listing-1",
    totalScore: 0,
    ruleScore: 0,
    calibratedScore: 0,
    confidenceBand: "directional",
    riskLevel: "low",
    recommendedAction: "ignore",
    reasons: [],
    features: {
      ruleScore: 0,
      ocrSuspiciousTermCount: 0,
      priceAnomalyRatio: null,
      sellerAuthorized: null,
      sourceConfidence: 0.8,
      imageSimilarityScore: null,
      regulatoryStatus: null,
      bpomNieMatch: null,
      packagingFieldMismatchCount: 0,
      ocrConfidence: null,
      evidenceCompleteness: 0.5,
    },
    scoringVersion: "test",
    triggeredRuleIds: [],
    createdAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

function judge(overrides: Partial<LlmJudgeAssessment>): LlmJudgeAssessment {
  return {
    id: "judge-1",
    listingId: "listing-1",
    scoreId: "score-1",
    provider: "mock",
    model: "mock",
    judgeRisk: "medium",
    confidence: "low",
    supportedReasons: [],
    contradictions: [],
    missingEvidence: [],
    recommendedNextAction: "Collect more evidence before escalation.",
    citedEvidenceIds: [],
    doNotClaimReasons: ["Do not claim authenticity status from this evidence alone."],
    rawJson: null,
    error: null,
    createdAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveOperationState", () => {
  it("prioritizes running and failed states before completed or queued", () => {
    expect(resolveOperationState({ running: true, completed: true })).toBe("running");
    expect(resolveOperationState({ failed: true, completed: true })).toBe("failed");
    expect(resolveOperationState({ skipped: true })).toBe("skipped");
    expect(resolveOperationState({ completed: true })).toBe("completed");
    expect(resolveOperationState({})).toBe("queued");
  });
});

describe("buildListingWorkflow", () => {
  it("derives a cold listing workflow that points users toward OCR next", () => {
    const steps = buildListingWorkflow({
      hasProductBaseline: true,
      hasOcr: false,
      hasRegulatory: false,
      hasVisual: false,
      hasScore: false,
      hasJudge: false,
      reviewStatus: null,
    });

    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ["baseline", "completed"],
      ["ocr", "queued"],
      ["regulatory", "queued"],
      ["visual", "queued"],
      ["score", "queued"],
      ["judge", "queued"],
      ["review", "queued"],
    ]);
    expect(steps[1].detail).toContain("Run OCR");
  });

  it("marks a full evidence workflow as ready for human review without implying enforcement", () => {
    const steps = buildListingWorkflow({
      hasProductBaseline: true,
      hasOcr: true,
      hasRegulatory: true,
      hasVisual: true,
      hasScore: true,
      hasJudge: true,
      reviewStatus: "pending",
    });

    expect(steps.at(-1)).toMatchObject({
      id: "review",
      state: "running",
      detail: "Internal reviewer label is pending.",
    });
  });
});

describe("getReviewStatusPresentation", () => {
  it("uses friendly internal human-review wording for confirmed labels", () => {
    const presentation = getReviewStatusPresentation("confirmed_counterfeit");

    expect(presentation.label).toBe("Confirmed risk by reviewer");
    expect(presentation.actionLabel).toBe("Mark confirmed risk");
    expect(presentation.helpText).toContain("internal");
    expect(presentation.helpText).not.toContain("marketplace report");
  });

  it("keeps the confusing rejected status readable for cold users", () => {
    const presentation = getReviewStatusPresentation("rejected_legitimate");

    expect(presentation.label).toBe("Likely legitimate");
    expect(presentation.actionLabel).toBe("Mark likely legitimate");
    expect(presentation.helpText).toContain("does not support escalation");
  });
});

describe("getRecommendedActionPresentation", () => {
  it("does not expose the raw enforce action as UI copy", () => {
    const presentation = getRecommendedActionPresentation("enforce");

    expect(presentation.label).toBe("Escalate for approval");
    expect(presentation.helpText).toContain("human approval");
    expect(presentation.label).not.toContain("enforce");
  });
});

describe("buildListingCaseBrief", () => {
  it("explains a cold listing without presenting a conclusion", () => {
    expect(typeof uiUx.buildListingCaseBrief).toBe("function");

    const brief = uiUx.buildListingCaseBrief({
      hasProductBaseline: false,
      score: null,
      evidenceCount: 0,
      regulatoryStatus: null,
      visualStatus: null,
      judge: null,
    });

    expect(brief.headline).toBe("Evidence review has not started");
    expect(brief.summary).toContain("Link a product baseline");
    expect(brief.summary).not.toMatch(/confirmed|proves|enforcement/i);
    expect(brief.recommendedNextStep).toContain("baseline");
    expect(brief.missingEvidence).toContain("Product baseline");
  });

  it("summarizes scored evidence with top reasons and advisory wording", () => {
    const brief = uiUx.buildListingCaseBrief({
      hasProductBaseline: true,
      evidenceCount: 4,
      regulatoryStatus: "mismatch",
      visualStatus: "mismatch",
      score: score({
        totalScore: 86,
        riskLevel: "critical",
        recommendedAction: "enforce",
        confidenceBand: "strong",
        reasons: [
          { ruleId: "BPOM_NIE_MISMATCH", ruleName: "BPOM / NIE Mismatch", message: "Expected NIE not found in OCR.", points: 30, evidenceRefs: ["e-1"] },
          { ruleId: "PRICE_ANOMALY", ruleName: "Price Anomaly", message: "Price is far below MSRP.", points: 25, evidenceRefs: ["e-2"] },
          { ruleId: "VISUAL_MISMATCH", ruleName: "Visual Package Mismatch", message: "Visual similarity is weak.", points: 18, evidenceRefs: ["e-3"] },
        ],
      }),
      judge: judge({ citedEvidenceIds: ["e-1"], supportedReasons: ["NIE mismatch is cited."] }),
    });

    expect(brief.headline).toBe("Route this listing to human review first");
    expect(brief.summary).toContain("advisory");
    expect(brief.summary).not.toMatch(/confirmed counterfeit|proves|automatic enforcement/i);
    expect(brief.topReasons.map((reason) => reason.title)).toEqual([
      "BPOM / NIE Mismatch",
      "Price Anomaly",
      "Visual Package Mismatch",
    ]);
    expect(brief.recommendedNextStep).toContain("approval");
  });

  it("surfaces missing evidence when the judge returns insufficient evidence", () => {
    const brief = uiUx.buildListingCaseBrief({
      hasProductBaseline: true,
      evidenceCount: 2,
      regulatoryStatus: "not_available",
      visualStatus: "not_available",
      score: score({ totalScore: 28, riskLevel: "medium", recommendedAction: "watch" }),
      judge: judge({
        judgeRisk: "insufficient_evidence",
        missingEvidence: ["public screenshot", "clear package image"],
        citedEvidenceIds: [],
      }),
    });

    expect(brief.headline).toBe("More evidence is needed before review confidence improves");
    expect(brief.missingEvidence).toEqual(expect.arrayContaining(["public screenshot", "clear package image"]));
    expect(brief.recommendedNextStep).toContain("evidence");
  });
});

describe("selectReviewRecommendation", () => {
  it("routes high scores to likely risk without suggesting confirmed risk", () => {
    expect(typeof uiUx.selectReviewRecommendation).toBe("function");

    const recommendation = uiUx.selectReviewRecommendation(score({ totalScore: 91, recommendedAction: "enforce", riskLevel: "critical" }));

    expect(recommendation.status).toBe("likely_counterfeit");
    expect(recommendation.actionLabel).toBe("Mark likely risk");
    expect(recommendation.reason).toContain("human review");
    expect(recommendation.status).not.toBe("confirmed_counterfeit");
  });

  it("uses needs-more-evidence for low-evidence scores", () => {
    const recommendation = uiUx.selectReviewRecommendation(score({
      totalScore: 55,
      riskLevel: "high",
      recommendedAction: "review",
      confidenceBand: "low_evidence",
    }));

    expect(recommendation.status).toBe("needs_more_evidence");
    expect(recommendation.reason).toContain("low evidence");
  });

  it("uses likely legitimate for low scores", () => {
    const recommendation = uiUx.selectReviewRecommendation(score({
      totalScore: 8,
      riskLevel: "low",
      recommendedAction: "ignore",
    }));

    expect(recommendation.status).toBe("rejected_legitimate");
    expect(recommendation.actionLabel).toBe("Mark likely legitimate");
  });
});

describe("getListingPrimaryAction", () => {
  it("requires baseline linking before the evidence pipeline can run", () => {
    expect(typeof uiUx.getListingPrimaryAction).toBe("function");

    const action = uiUx.getListingPrimaryAction({ hasProductBaseline: false, loading: false });

    expect(action.label).toBe("Link baseline first");
    expect(action.disabled).toBe(true);
    expect(action.reason).toContain("product baseline");
  });

  it("enables the evidence pipeline when a product baseline is linked", () => {
    const action = uiUx.getListingPrimaryAction({ hasProductBaseline: true, loading: false });

    expect(action.label).toBe("Run recommended pipeline");
    expect(action.disabled).toBe(false);
    expect(action.reason).toContain("OCR");
  });
});

describe("getListingNextAction", () => {
  it("puts baseline linking first before pipeline work", () => {
    const action = getListingNextAction({
      hasProductBaseline: false,
      loading: false,
      score: null,
      reviewStatus: null,
      judge: null,
      missingEvidenceCount: 0,
    });

    expect(action.kind).toBe("link_baseline");
    expect(action.title).toContain("Link official product truth");
    expect(action.detail).not.toMatch(/proves|counterfeit conclusion|enforcement/i);
  });

  it("explains when a low score does not create a review item", () => {
    const action = getListingNextAction({
      hasProductBaseline: true,
      loading: false,
      score: score({ totalScore: 8, recommendedAction: "ignore" }),
      reviewStatus: null,
      judge: null,
      missingEvidenceCount: 0,
    });

    expect(action.kind).toBe("below_threshold");
    expect(action.detail).toContain("below the routing threshold");
    expect(action.detail).toContain("advisory");
  });

  it("prioritizes review labels when a pending review item exists", () => {
    const action = getListingNextAction({
      hasProductBaseline: true,
      loading: false,
      score: score({ totalScore: 70, recommendedAction: "review" }),
      reviewStatus: "pending",
      judge: judge({ citedEvidenceIds: ["e-1"] }),
      missingEvidenceCount: 0,
    });

    expect(action.kind).toBe("review");
    expect(action.primaryLabel).toBe("Review this case");
  });
});

describe("getBaselineExplanation", () => {
  it("explains baseline linking without implying source listing changes", () => {
    const explanation = getBaselineExplanation();

    expect(explanation.title).toBe("Official product truth used for comparison");
    expect(explanation.summary).toContain("BrandArmor compares this listing");
    expect(explanation.does).toContain("Adds the expected product, seller, BPOM/NIE, price, and packaging context to this review.");
    expect(explanation.doesNot).toContain("Does not edit the marketplace listing or prove the listing is counterfeit.");
    expect(explanation.nextStep).toContain("Choose the matching product baseline");
    expect(explanation.contextFields).toEqual(["Product name", "BPOM/NIE", "Expected price", "Authorized sellers"]);
  });
});

describe("ambient usability status", () => {
  it("summarizes actionable workspace gaps without making enforcement claims", () => {
    expect(typeof uiUx.selectAmbientStatus).toBe("function");

    const status = selectAmbientStatus({
      listingCount: 3,
      unlinkedListingCount: 1,
      unscoredListingCount: 2,
      pendingReviewCount: 4,
      highRiskScoreCount: 1,
      evaluationCaseCount: 50,
      reviewDecisionCount: 2,
      currentPath: "/listings",
    });

    expect(status.headline).toBe("2 listings still need evidence scores");
    expect(status.nextActionLabel).toBe("Open listings");
    expect(status.nextActionHref).toBe("/listings");
    expect(status.items.map((item) => item.id)).toEqual([
      "baseline_gaps",
      "score_gaps",
      "pending_reviews",
      "pilot_dataset",
    ]);
    expect(status.summary).toContain("what needs attention next");
    expect(`${status.headline} ${status.summary} ${status.items.map((item) => item.label).join(" ")}`).not.toMatch(/proves|automatic enforcement|production image retrieval/i);
  });

  it("uses review work as the next action once listings are scored", () => {
    const status = selectAmbientStatus({
      listingCount: 2,
      unlinkedListingCount: 0,
      unscoredListingCount: 0,
      pendingReviewCount: 3,
      highRiskScoreCount: 1,
      evaluationCaseCount: 50,
      reviewDecisionCount: 3,
      currentPath: "/review",
    });

    expect(status.headline).toBe("3 internal review labels waiting");
    expect(status.nextActionHref).toBe("/review");
    expect(status.items.find((item) => item.id === "pending_reviews")?.badge).toBe("3");
  });
});

describe("sidebar status badges", () => {
  it("adds compact badges only where status should guide action", () => {
    expect(typeof uiUx.decorateSidebarNavigationGroups).toBe("function");

    const groups = uiUx.decorateSidebarNavigationGroups(uiUx.getSidebarNavigationGroups(), {
      listingCount: 5,
      unlinkedListingCount: 1,
      unscoredListingCount: 2,
      pendingReviewCount: 3,
      highRiskScoreCount: 1,
      evaluationCaseCount: 50,
      reviewDecisionCount: 1,
      currentPath: "/",
    });

    const primary = groups.find((group) => group.id === "primary");
    expect(primary?.items.find((item) => item.href === "/listings")?.badge).toBe("3");
    expect(primary?.items.find((item) => item.href === "/review")?.badge).toBe("3");
    expect(primary?.items.find((item) => item.href === "/evaluation")?.badge).toBe("pilot");
    expect(primary?.items.find((item) => item.href === "/demo")?.badge).toBeUndefined();
  });
});

describe("buildMediaPreview", () => {
  it("uses a claim-safe placeholder for demo example.com media", () => {
    const preview = buildMediaPreview({
      screenshotUrl: "https://example.com/somethinc-demo.png",
      imageUrls: [],
      listingLimitations: ["demo screenshot URL placeholder"],
      sourceConfidence: 0.8,
      visualStatus: "mismatch",
      visualProvider: "mock",
      productOfficialImageUrls: [],
      referenceImageNotes: "Official page is a reference pointer.",
    });

    expect(preview.renderMode).toBe("demo_placeholder");
    expect(preview.primaryUrl).toBeNull();
    expect(preview.sourceLabel).toContain("demo placeholder");
    expect(preview.visualStatusLabel).toContain("mock");
    expect(preview.limitationText).toContain("Demo visual placeholder");
    expect(preview.limitationText).not.toMatch(/production image retrieval|SigLIP|DINOv2|CLIP/i);
  });

  it("renders user-provided media URLs directly when they are not placeholders", () => {
    const preview = buildMediaPreview({
      screenshotUrl: null,
      imageUrls: ["https://cdn.example.test/listing.png"],
      listingLimitations: [],
      sourceConfidence: 0.9,
      visualStatus: null,
      visualProvider: null,
      productOfficialImageUrls: ["https://brand.example.test/reference.png"],
      referenceImageNotes: null,
    });

    expect(preview.renderMode).toBe("image");
    expect(preview.primaryUrl).toBe("https://cdn.example.test/listing.png");
    expect(preview.referenceLabel).toBe("1 official reference image recorded");
  });
});

describe("getReviewNextStepActions", () => {
  it("guides reviewers after a risk label without triggering external action", () => {
    const actions = getReviewNextStepActions("listing-1", "likely_counterfeit");

    expect(actions.map((action) => action.label)).toEqual([
      "Review next case",
      "Open listing workspace",
      "View evaluation",
    ]);
    expect(actions.map((action) => action.href)).toEqual([
      "/review",
      "/listings/listing-1",
      "/evaluation",
    ]);
    expect(actions.map((action) => action.label).join(" ")).not.toMatch(/submit|enforce|report/i);
  });

  it("prioritizes evidence collection when the selected label needs more evidence", () => {
    const actions = getReviewNextStepActions("listing-1", "needs_more_evidence");

    expect(actions[0]).toMatchObject({
      label: "Open listing to collect evidence",
      href: "/listings/listing-1",
    });
  });
});

describe("summarizeReviewQueue", () => {
  it("frames total, pending, and labeled review work", () => {
    const summary = summarizeReviewQueue(["pending", "likely_counterfeit", "needs_more_evidence"]);

    expect(summary).toMatchObject({
      total: 3,
      pending: 1,
      labeled: 2,
      headline: "3 items / 1 pending / 2 labeled",
    });
    expect(summary.detail).toContain("internal review queue");
    expect(summary.detail).not.toMatch(/automatic|proves|takedown/i);
  });
});

describe("selectReviewAlternativeOptions", () => {
  it("excludes the suggested review status from alternative labels", () => {
    expect(typeof uiUx.selectReviewAlternativeOptions).toBe("function");

    const alternatives = uiUx.selectReviewAlternativeOptions("likely_counterfeit");

    expect(alternatives.map((option) => option.status)).not.toContain("likely_counterfeit");
    expect(alternatives.map((option) => option.status)).toContain("confirmed_counterfeit");
    expect(alternatives.every((option) => option.actionLabel.length > 0)).toBe(true);
  });
});

describe("review confirmation copy", () => {
  it("requires explicit confirmation language before saving a review label", () => {
    expect(typeof uiUx.getReviewConfirmation).toBe("function");

    const confirmation = uiUx.getReviewConfirmation("likely_counterfeit");

    expect(confirmation.title).toBe("Confirm internal review label");
    expect(confirmation.confirmLabel).toBe("Save internal label");
    expect(confirmation.summary).toContain("Likely risk");
    expect(confirmation.summary).toContain("internal");
    expect(confirmation.summary).not.toMatch(/submit|marketplace|seller contact|enforcement|legal conclusion/i);
  });

  it("explains terminal labels without presenting external action", () => {
    const confirmation = uiUx.getReviewConfirmation("confirmed_counterfeit");

    expect(confirmation.summary).toContain("Confirmed risk by reviewer");
    expect(confirmation.safetyNote).toContain("No external report");
    expect(`${confirmation.summary} ${confirmation.safetyNote}`).not.toMatch(/automatic|proof|takedown/i);
  });
});

describe("empty-state diagnostics", () => {
  it("identifies missing review prerequisites", () => {
    expect(typeof uiUx.getReviewQueueEmptyState).toBe("function");

    expect(uiUx.getReviewQueueEmptyState({ listingCount: 0, scoreCount: 0 })).toMatchObject({
      title: "No candidate listings yet",
      primaryHref: "/demo",
    });

    expect(uiUx.getReviewQueueEmptyState({ listingCount: 2, scoreCount: 0 })).toMatchObject({
      title: "Listings need evidence scores first",
      primaryHref: "/listings",
    });

    expect(uiUx.getReviewQueueEmptyState({ listingCount: 2, scoreCount: 2 })).toMatchObject({
      title: "No review decisions queued",
      primaryHref: "/listings",
    });
  });

  it("identifies missing evaluation prerequisites", () => {
    expect(typeof uiUx.getEvaluationEmptyState).toBe("function");

    expect(uiUx.getEvaluationEmptyState({ listingCount: 0, reviewDecisionCount: 0 })).toMatchObject({
      title: "No listings available for evaluation",
      primaryHref: "/demo",
    });

    expect(uiUx.getEvaluationEmptyState({ listingCount: 3, reviewDecisionCount: 0 })).toMatchObject({
      title: "No internal review labels yet",
      primaryHref: "/review",
    });
  });
});

describe("term glossary", () => {
  it("explains domain terms without making proof claims", () => {
    expect(typeof uiUx.getTermHelp).toBe("function");

    const bpom = uiUx.getTermHelp("bpom_nie");
    const scoreHelp = uiUx.getTermHelp("routing_score");

    expect(bpom.label).toBe("BPOM/NIE");
    expect(bpom.description).toContain("Indonesian cosmetics registration");
    expect(bpom.mobileHint).toContain("Tap");
    expect(scoreHelp.description).toContain("review");
    expect(`${bpom.description} ${scoreHelp.description}`).not.toMatch(/proves|confirmed counterfeit|guarantee/i);
  });
});

describe("sidebar navigation groups", () => {
  it("keeps the primary demo path small and moves setup routes into a secondary group", () => {
    expect(typeof uiUx.getSidebarNavigationGroups).toBe("function");

    const groups = uiUx.getSidebarNavigationGroups();
    const primary = groups.find((group) => group.id === "primary");
    const setup = groups.find((group) => group.id === "setup");

    expect(primary?.items.map((item) => item.label)).toEqual([
      "Start",
      "Run Demo",
      "Listings",
      "Review Queue",
      "Evaluation",
    ]);
    expect(primary?.items.map((item) => item.href)).toContain("/demo");
    expect(setup?.items.map((item) => item.label)).toEqual([
      "Brands",
      "Discovery",
    ]);
  });
});

describe("listing workspace readable labels", () => {
  it("explains listing source fields without exposing raw storage names", () => {
    expect(uiUx.getTermHelp("source_confidence").description).toContain("how reliable");
    expect(uiUx.getTermHelp("pilot_label").description).toContain("fixture");
    expect(uiUx.getTermHelp("visual_comparison").description).toContain("adapter/mock");
    expect(uiUx.getListingSourceTypeLabel("browser_capture")).toBe("Browser capture");
    expect(uiUx.getPilotLabelPresentation("likely_counterfeit")).toBe("Likely risk fixture");
    expect(uiUx.getPilotLabelPresentation(null)).toBe("Unlabeled");
  });
});

describe("selectEvaluationSummary", () => {
  it("selects the highest F1 threshold and breaks ties by lower review burden", () => {
    const summary = selectEvaluationSummary({
      cases: 50,
      metrics: [
        metric({ threshold: 40, precision: 0.65, recall: 0.7, reviewBurden: 0.5, totalCases: 50 }),
        metric({ threshold: 50, precision: 0.8, recall: 0.6, reviewBurden: 0.3, totalCases: 50 }),
        metric({ threshold: 60, precision: 0.6, recall: 0.8, reviewBurden: 0.2, totalCases: 50 }),
      ],
    });

    expect(summary.best?.threshold).toBe(60);
    expect(summary.f1).toBeCloseTo(0.6857, 4);
    expect(summary.datasetLabel).toBe("50 labeled pilot cases");
    expect(summary.limitNote).toContain("pilot dataset");
    expect(summary.limitTone).toBe("warning");
    expect(summary.metricDisplayMode).toBe("guarded");
    expect(summary.limitHeadline).toBe("Pilot only: dataset below roadmap floor");
  });

  it("handles empty metric lists without inventing confidence", () => {
    const summary = selectEvaluationSummary({ cases: 0, metrics: [] });

    expect(summary.best).toBeNull();
    expect(summary.f1).toBe(0);
    expect(summary.datasetLabel).toBe("No labeled cases yet");
    expect(summary.limitTone).toBe("warning");
    expect(summary.metricDisplayMode).toBe("guarded");
  });
});

describe("selectEvaluationPlainLanguageSummary", () => {
  it("leads with reviewer workload and useful review share", () => {
    const summary = selectEvaluationSummary({
      cases: 50,
      metrics: [
        metric({ threshold: 50, precision: 0.75, recall: 0.6, reviewBurden: 0.4, totalCases: 50 }),
      ],
    });
    const plain = selectEvaluationPlainLanguageSummary(summary);

    expect(plain.headline).toBe("At the current pilot setting, reviewers would inspect 40% of listings.");
    expect(plain.detail).toContain("75% of reviewed pilot listings");
    expect(plain.detail).toContain("pilot dataset");
    expect(`${plain.headline} ${plain.detail}`).not.toMatch(/production accuracy|proves/i);
  });
});

describe("SAMPLE_LISTING_IMPORT_JSON", () => {
  it("contains a productId field so imports can demonstrate baseline linking", () => {
    expect(typeof uiUx.SAMPLE_LISTING_IMPORT_JSON).toBe("string");

    const parsed = JSON.parse(uiUx.SAMPLE_LISTING_IMPORT_JSON);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].productId).toBe("replace-with-product-baseline-id");
    expect(parsed[0].sourceType).toBe("json_import");
  });
});

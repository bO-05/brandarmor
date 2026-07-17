import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createReviewDecision,
  createScore,
  deleteReviewDecision,
  getReviewDecision,
  getScore,
  resetDataDir,
  setDataDir,
} from "../src/persistence/store";

function scoreInput(listingId: string, totalScore: number) {
  return {
    listingId,
    totalScore,
    ruleScore: totalScore,
    calibratedScore: totalScore,
    confidenceBand: "directional" as const,
    riskLevel: totalScore >= 50 ? "high" as const : "low" as const,
    recommendedAction: totalScore >= 50 ? "review" as const : "ignore" as const,
    reasons: [],
    features: {
      ruleScore: totalScore,
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
  };
}

describe("score and review reconciliation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-score-review-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("preserves the score identity across reruns and can remove an obsolete review", () => {
    const first = createScore(scoreInput("listing-1", 80));
    createReviewDecision({ listingId: "listing-1", scoreId: first.id, status: "pending" });

    const rerun = createScore(scoreInput("listing-1", 10));

    expect(rerun.id).toBe(first.id);
    expect(getScore("listing-1")?.id).toBe(first.id);
    expect(getReviewDecision("listing-1")?.scoreId).toBe(first.id);

    deleteReviewDecision("listing-1");
    expect(getReviewDecision("listing-1")).toBeUndefined();
  });
});

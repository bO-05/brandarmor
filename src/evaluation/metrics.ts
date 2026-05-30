import type { EvaluationMetrics, GroundTruthLabel, RiskLevel, Score } from "@/domain/types";

export function computeMetrics(
  cases: Array<{
    groundTruth: GroundTruthLabel;
    score: Pick<Score, "totalScore" | "riskLevel">;
  }>,
  threshold: number = 50
): EvaluationMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (const c of cases) {
    const predictedPositive = c.score.totalScore >= threshold;
    const actualPositive = c.groundTruth === "counterfeit" || c.groundTruth === "likely_counterfeit" || c.groundTruth === "expired_or_unsafe";

    if (predictedPositive && actualPositive) tp++;
    else if (predictedPositive && !actualPositive) fp++;
    else if (!predictedPositive && !actualPositive) tn++;
    else if (!predictedPositive && actualPositive) fn++;
  }

  const total = tp + fp + tn + fn;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  const fnr = fn + tp > 0 ? fn / (fn + tp) : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const sorted = cases.toSorted((a, b) => b.score.totalScore - a.score.totalScore);
  const k = Math.min(10, sorted.length);
  const topK = k > 0 ? sorted.slice(0, k) : [];
  const precisionAtK = k > 0 ? topK.filter((c) => c.groundTruth === "counterfeit" || c.groundTruth === "likely_counterfeit" || c.groundTruth === "expired_or_unsafe").length / k : 0;
  const reviewBurden = total > 0 ? cases.filter((c) => c.score.totalScore >= threshold).length / total : 0;

  return {
    threshold,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    falsePositiveRate: Math.round(fpr * 10000) / 10000,
    falseNegativeRate: Math.round(fnr * 10000) / 10000,
    accuracy: Math.round(accuracy * 10000) / 10000,
    precisionAtK: Math.round(precisionAtK * 10000) / 10000,
    reviewBurden: Math.round(reviewBurden * 10000) / 10000,
    totalCases: total,
  };
}

export function computeMetricsByThresholds(
  cases: Array<{
    groundTruth: GroundTruthLabel;
    score: Pick<Score, "totalScore" | "riskLevel">;
  }>,
  thresholds: number[] = [20, 30, 40, 50, 60, 70, 80]
): EvaluationMetrics[] {
  return thresholds.map((t) => computeMetrics(cases, t));
}

import { describe, it, expect } from "vitest";
import { computeMetrics, computeMetricsByThresholds } from "../src/evaluation/metrics";

describe("computeMetrics", () => {
  const perfectCase = [
    { groundTruth: "counterfeit" as const, score: { totalScore: 90, riskLevel: "critical" as const } },
    { groundTruth: "legitimate" as const, score: { totalScore: 10, riskLevel: "low" as const } },
  ];

  const problematicCase = [
    { groundTruth: "counterfeit" as const, score: { totalScore: 90, riskLevel: "critical" as const } },
    { groundTruth: "legitimate" as const, score: { totalScore: 70, riskLevel: "high" as const } },
    { groundTruth: "counterfeit" as const, score: { totalScore: 30, riskLevel: "medium" as const } },
    { groundTruth: "legitimate" as const, score: { totalScore: 10, riskLevel: "low" as const } },
  ];

  it("perfect precision and recall at threshold 50", () => {
    const metrics = computeMetrics(perfectCase, 50);
    expect(metrics.truePositives).toBe(1);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.trueNegatives).toBe(1);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.accuracy).toBe(1);
  });

  it("handles false positives", () => {
    const metrics = computeMetrics(problematicCase, 50);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.precision).toBe(0.5);
    expect(metrics.falsePositiveRate).toBe(0.5);
  });

  it("handles false negatives", () => {
    const metrics = computeMetrics(problematicCase, 50);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.recall).toBe(0.5);
    expect(metrics.falseNegativeRate).toBe(0.5);
  });

  it("handles empty case list", () => {
    const metrics = computeMetrics([], 50);
    expect(metrics.totalCases).toBe(0);
  });

  it("uses threshold to classify", () => {
    const cases = [
      { groundTruth: "counterfeit" as const, score: { totalScore: 40, riskLevel: "medium" as const } },
      { groundTruth: "legitimate" as const, score: { totalScore: 40, riskLevel: "medium" as const } },
    ];
    const lowThreshold = computeMetrics(cases, 30);
    const highThreshold = computeMetrics(cases, 50);
    expect(lowThreshold.truePositives).toBe(1);
    expect(highThreshold.truePositives).toBe(0);
  });
});

describe("computeMetricsByThresholds", () => {
  it("returns metrics for each threshold", () => {
    const cases = [
      { groundTruth: "counterfeit" as const, score: { totalScore: 75, riskLevel: "high" as const } },
      { groundTruth: "legitimate" as const, score: { totalScore: 15, riskLevel: "low" as const } },
    ];
    const results = computeMetricsByThresholds(cases, [40, 60, 80]);
    expect(results.length).toBe(3);
    expect(results[0].threshold).toBe(40);
    expect(results[1].threshold).toBe(60);
    expect(results[2].threshold).toBe(80);
  });
});

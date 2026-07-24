import { NextResponse } from "next/server";
import { getEvaluationCases, createEvaluationCasesBulk } from "@/persistence/store";
import { computeScore } from "@/domain/scoring";
import { computeMetricsByThresholds } from "@/evaluation/metrics";
import { EVALUATION_FIXTURES } from "@/evaluation/fixtures";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const compute = searchParams.get("compute");

    let cases = getEvaluationCases();
    if (cases.length === 0) {
      // Auto-seed fixtures
      createEvaluationCasesBulk(EVALUATION_FIXTURES);
      cases = getEvaluationCases();
    }

    const diagnosticMetadata = {
      evaluationMode: "synthetic_regression_diagnostics" as const,
      accuracyClaimsSupported: false,
      datasetLabel: "50 authored fixtures for regression diagnostics, not an independently reviewed holdout dataset",
    };

    if (compute === "true") {
      const scored = cases.map((c) => ({
        groundTruth: c.groundTruth,
        score: computeScore(c.listing),
      }));
      const metrics = computeMetricsByThresholds(scored);
      return NextResponse.json({ cases: cases.length, metrics, ...diagnosticMetadata });
    }

    // Evaluation labels are intentionally not returned through the operational API.
    return NextResponse.json({ cases: cases.length, ...diagnosticMetadata });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fixtures = Array.isArray(body) ? body : [body];
    const created = createEvaluationCasesBulk(fixtures);
    return NextResponse.json({ created: created.length, cases: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

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

    if (compute === "true") {
      const scored = cases.map((c) => ({
        groundTruth: c.groundTruth,
        score: computeScore(c.listing),
      }));
      const metrics = computeMetricsByThresholds(scored);
      return NextResponse.json({ cases: cases.length, metrics });
    }

    return NextResponse.json({ cases });
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

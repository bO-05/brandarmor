import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { addReviewedEvaluationCases, listReviewedEvaluationCases } from "@/db/evaluation-repository";
import { getEvaluationCases, createEvaluationCasesBulk } from "@/persistence/store";
import { computeScore } from "@/domain/scoring";
import type { Listing, Product } from "@/domain/types";
import { computeMetricsByThresholds } from "@/evaluation/metrics";
import { EVALUATION_FIXTURES } from "@/evaluation/fixtures";
import { requirePilotAdminActor, requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

const reviewedCaseSchema = z.object({
  datasetVersion: z.string().min(1),
  externalCaseId: z.string().min(1),
  listingSnapshot: z.record(z.unknown()),
  baselineSnapshot: z.record(z.unknown()).nullable().optional(),
  reviewedLabel: z.enum(["counterfeit", "legitimate", "likely_counterfeit", "gray_market_import", "expired_or_unsafe", "insufficient_evidence", "unknown"]),
  reviewerEvidenceRef: z.string().min(1),
  provenance: z.record(z.unknown()),
  ambiguous: z.boolean().optional(),
  reviewedAt: z.string().datetime(),
});

function wilsonInterval(successes: number, total: number): [number, number] | null {
  if (!total) return null;
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denominator;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const compute = searchParams.get("compute");
    const access = await requirePilotWriteActor(request);
    if (!access.allowed) return access.response;

    if (access.actor?.workspaceId) {
      const cases = await listReviewedEvaluationCases(searchParams.get("datasetVersion") ?? undefined);
      const classDistribution = Object.fromEntries(cases.reduce((counts, item) => {
        counts.set(item.reviewedLabel, (counts.get(item.reviewedLabel) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()));
      const reviewedMetadata = {
        evaluationMode: "independently_reviewed_holdout" as const,
        accuracyClaimsSupported: cases.length >= 30,
        datasetLabel: cases.length
          ? `${cases.length} provenance-documented independently reviewed holdout cases`
          : "No independently reviewed holdout cases have been imported",
        classDistribution,
        ambiguityCount: cases.filter((item) => item.ambiguous === 1).length,
      };
      if (compute === "true" && cases.length) {
        const scored = cases.map((item) => ({
          groundTruth: item.reviewedLabel as "counterfeit" | "legitimate" | "likely_counterfeit" | "gray_market_import" | "expired_or_unsafe" | "insufficient_evidence" | "unknown",
          score: computeScore(item.listingSnapshot as unknown as Listing, item.baselineSnapshot as unknown as Product | undefined),
        }));
        const metrics = computeMetricsByThresholds(scored);
        const selected = metrics[0];
        const precisionInterval = selected ? wilsonInterval(selected.truePositives, selected.truePositives + selected.falsePositives) : null;
        const recallInterval = selected ? wilsonInterval(selected.truePositives, selected.truePositives + selected.falseNegatives) : null;
        return NextResponse.json({ cases: cases.length, metrics, precisionInterval, recallInterval, ...reviewedMetadata });
      }
      return NextResponse.json({ cases: cases.length, metrics: [], ...reviewedMetadata });
    }

    let cases = getEvaluationCases();
    if (cases.length === 0) {
      createEvaluationCasesBulk(EVALUATION_FIXTURES);
      cases = getEvaluationCases();
    }
    const diagnosticMetadata = {
      evaluationMode: "synthetic_regression_diagnostics" as const,
      accuracyClaimsSupported: false,
      datasetLabel: "50 authored fixtures for regression diagnostics, not an independently reviewed holdout dataset",
    };
    if (compute === "true") {
      const scored = cases.map((c) => ({ groundTruth: c.groundTruth, score: computeScore(c.listing) }));
      return NextResponse.json({ cases: cases.length, metrics: computeMetricsByThresholds(scored), ...diagnosticMetadata });
    }
    return NextResponse.json({ cases: cases.length, ...diagnosticMetadata });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (isControlledDemoMode()) return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  const access = await requirePilotAdminActor(request);
  if (!access.allowed) return access.response;
  try {
    const body = await request.json();
    const entries = Array.isArray(body) ? body : [body];
    const parsed = z.array(reviewedCaseSchema).safeParse(entries);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    if (access.actor?.workspaceId) {
      const created = await addReviewedEvaluationCases(parsed.data);
      return NextResponse.json({ created: created.length }, { status: 201 });
    }
    const created = createEvaluationCasesBulk(entries);
    return NextResponse.json({ created: created.length, cases: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "./index";
import { evaluationCases } from "./schema";

export type ReviewedEvaluationCaseInput = {
  datasetVersion: string;
  externalCaseId: string;
  listingSnapshot: Record<string, unknown>;
  baselineSnapshot?: Record<string, unknown> | null;
  reviewedLabel: string;
  reviewerEvidenceRef: string;
  provenance: Record<string, unknown>;
  ambiguous?: boolean;
  reviewedAt: string;
};

export async function listReviewedEvaluationCases(workspaceId: string, datasetVersion?: string) {
  const db = getDatabase();
  const rows = datasetVersion
    ? await db.select().from(evaluationCases).where(and(eq(evaluationCases.workspaceId, workspaceId), eq(evaluationCases.datasetVersion, datasetVersion))).orderBy(desc(evaluationCases.reviewedAt))
    : await db.select().from(evaluationCases).where(eq(evaluationCases.workspaceId, workspaceId)).orderBy(desc(evaluationCases.reviewedAt));
  return rows;
}

export async function addReviewedEvaluationCases(workspaceId: string, inputs: ReviewedEvaluationCaseInput[]) {
  if (!inputs.length) return [];
  const db = getDatabase();
  return db
    .insert(evaluationCases)
    .values(inputs.map((input) => ({
      workspaceId,
      datasetVersion: input.datasetVersion,
      externalCaseId: input.externalCaseId,
      listingSnapshot: input.listingSnapshot,
      baselineSnapshot: input.baselineSnapshot ?? null,
      reviewedLabel: input.reviewedLabel,
      reviewerEvidenceRef: input.reviewerEvidenceRef,
      provenance: input.provenance,
      ambiguous: input.ambiguous ? 1 : 0,
      reviewedAt: new Date(input.reviewedAt),
    })))
    .onConflictDoNothing({ target: [evaluationCases.workspaceId, evaluationCases.datasetVersion, evaluationCases.externalCaseId] })
    .returning();
}

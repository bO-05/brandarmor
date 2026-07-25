import { desc, eq } from "drizzle-orm";

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

export async function listReviewedEvaluationCases(datasetVersion?: string) {
  const db = getDatabase();
  const query = db.select().from(evaluationCases);
  const rows = datasetVersion
    ? await query.where(eq(evaluationCases.datasetVersion, datasetVersion)).orderBy(desc(evaluationCases.reviewedAt))
    : await query.orderBy(desc(evaluationCases.reviewedAt));
  return rows;
}

export async function addReviewedEvaluationCases(inputs: ReviewedEvaluationCaseInput[]) {
  const db = getDatabase();
  const inserted = [];
  for (const input of inputs) {
    const [row] = await db
      .insert(evaluationCases)
      .values({
        datasetVersion: input.datasetVersion,
        externalCaseId: input.externalCaseId,
        listingSnapshot: input.listingSnapshot,
        baselineSnapshot: input.baselineSnapshot ?? null,
        reviewedLabel: input.reviewedLabel,
        reviewerEvidenceRef: input.reviewerEvidenceRef,
        provenance: input.provenance,
        ambiguous: input.ambiguous ? 1 : 0,
        reviewedAt: new Date(input.reviewedAt),
      })
      .onConflictDoNothing({ target: [evaluationCases.datasetVersion, evaluationCases.externalCaseId] })
      .returning();
    if (row) inserted.push(row);
  }
  return inserted;
}

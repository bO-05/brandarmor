import { createHash } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";

import { computeScore, SCORING_VERSION } from "@/domain/scoring";
import type { Listing, Product, Score } from "@/domain/types";

import { getDatabase } from "./index";
import { listPilotCaseAssets } from "./case-assets-repository";
import {
  auditEvents,
  evidenceItems,
  investigations,
  investigationStages,
  outboxEvents,
  reportVersions,
  reviewDecisions,
  scoreSnapshots,
} from "./schema";

const STAGES = ["intake", "ocr", "regulatory", "visual", "scoring", "judge", "human_review", "report"] as const;
type Stage = (typeof STAGES)[number];

type PilotActorContext = {
  workspaceId: string;
  userId: string;
};

type InvestigationSnapshot = {
  id: string;
  listingId: string;
  productBaselineId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type InvestigationStageSnapshot = {
  stage: Stage;
  status: string;
  attempt: number;
  safeError: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toTimestamp(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function mapInvestigation(row: typeof investigations.$inferSelect): InvestigationSnapshot {
  return {
    id: row.id,
    listingId: row.listingId,
    productBaselineId: row.productBaselineId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: toTimestamp(row.completedAt),
  };
}

function mapStage(row: typeof investigationStages.$inferSelect): InvestigationStageSnapshot {
  return {
    stage: row.stage as Stage,
    status: row.status,
    attempt: row.attempt,
    safeError: row.safeError,
    startedAt: toTimestamp(row.startedAt),
    completedAt: toTimestamp(row.completedAt),
  };
}

export type PilotInvestigationState = {
  investigation: InvestigationSnapshot;
  stages: InvestigationStageSnapshot[];
  evidence: Array<{
    id: string;
    evidenceType: string;
    fieldName: string;
    extractedValue: string | null;
    confidence: number | null;
    collectionStatus: string;
    provenance: string;
    notes: string | null;
    createdAt: string;
  }>;
  score: Pick<Score, "riskScore" | "evidenceCompleteness" | "confidence" | "riskLevel" | "recommendedAction" | "reasons" | "scoringVersion"> | null;
  review: { id: string; status: string; revision: number; updatedAt: string } | null;
  report: { id: string; version: number; lifecycleStatus: string; createdAt: string } | null;
};

export async function createOrReusePilotInvestigation(
  actor: PilotActorContext,
  listing: Listing,
  product: Product | null,
): Promise<{ state: PilotInvestigationState; created: boolean }> {
  const db = getDatabase();
  const inputFingerprint = fingerprint({ listing, product, workflowVersion: "pilot-v1" });

  const [before] = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(and(
      eq(investigations.workspaceId, actor.workspaceId),
      eq(investigations.inputFingerprint, inputFingerprint),
    ))
    .limit(1);

  if (!before) {
    await db
      .insert(investigations)
      .values({
        workspaceId: actor.workspaceId,
        listingId: listing.id,
        productBaselineId: product?.id ?? null,
        listingSnapshot: listing,
        baselineSnapshot: product,
        status: "queued",
        inputFingerprint,
        requestedByUserId: actor.userId,
      })
      .onConflictDoNothing({ target: [investigations.workspaceId, investigations.inputFingerprint] });
  }

  const [investigation] = await db
    .select()
    .from(investigations)
    .where(and(
      eq(investigations.workspaceId, actor.workspaceId),
      eq(investigations.inputFingerprint, inputFingerprint),
    ))
    .limit(1);
  if (!investigation) throw new Error("Investigation creation did not resolve a durable investigation.");

  for (const stage of STAGES) {
    await db
      .insert(investigationStages)
      .values({
        workspaceId: actor.workspaceId,
        investigationId: investigation.id,
        stage,
        status: "pending",
        inputFingerprint,
      })
      .onConflictDoNothing({ target: [investigationStages.investigationId, investigationStages.stage, investigationStages.inputFingerprint] });
  }

  if (!before) {
    await db.insert(auditEvents).values({
      workspaceId: actor.workspaceId,
      actorUserId: actor.userId,
      action: "investigation.queued",
      entityType: "investigation",
      entityId: investigation.id,
      correlationId: investigation.id,
      safeMetadata: { listingId: listing.id, hasBaseline: Boolean(product) },
    });
    await db.insert(outboxEvents).values({
      workspaceId: actor.workspaceId,
      topic: "investigation.queued",
      payload: { investigationId: investigation.id },
    });
  }

  return { state: await getPilotInvestigationState(actor.workspaceId, investigation.id), created: !before };
}

async function updateStage(
  workspaceId: string,
  investigationId: string,
  stage: Stage,
  status: "running" | "succeeded" | "partial" | "failed" | "skipped",
  safeError: string | null = null,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .update(investigationStages)
    .set({
      status,
      attempt: status === "running" ? 1 : undefined,
      startedAt: status === "running" ? now : undefined,
      completedAt: status === "running" ? undefined : now,
      safeError,
      leaseExpiresAt: status === "running" ? new Date(Date.now() + 60_000) : null,
    })
    .where(and(
      eq(investigationStages.workspaceId, workspaceId),
      eq(investigationStages.investigationId, investigationId),
      eq(investigationStages.stage, stage),
    ));
}

function toScoreSnapshot(score: Pick<Score, "riskScore" | "totalScore" | "evidenceCompleteness" | "confidence" | "riskLevel" | "recommendedAction" | "reasons" | "scoringVersion">) {
  return {
    riskScore: score.riskScore ?? score.totalScore,
    evidenceCompletenessBasisPoints: Math.round((score.evidenceCompleteness ?? 0) * 10_000),
    confidence: score.confidence ?? "low",
    riskLevel: score.riskLevel,
    recommendedAction: score.recommendedAction,
    reasons: score.reasons,
    scoringVersion: score.scoringVersion || SCORING_VERSION,
  };
}

function compactScore(row: typeof scoreSnapshots.$inferSelect): PilotInvestigationState["score"] {
  return {
    riskScore: row.riskScore,
    evidenceCompleteness: row.evidenceCompletenessBasisPoints / 10_000,
    confidence: row.confidence,
    riskLevel: row.riskLevel as Score["riskLevel"],
    recommendedAction: row.recommendedAction as Score["recommendedAction"],
    reasons: row.reasons as Score["reasons"],
    scoringVersion: row.scoringVersion,
  };
}

export async function runPilotInvestigation(
  actor: PilotActorContext,
  investigationId: string,
): Promise<PilotInvestigationState> {
  const db = getDatabase();
  const [investigation] = await db
    .select()
    .from(investigations)
    .where(and(eq(investigations.workspaceId, actor.workspaceId), eq(investigations.id, investigationId)))
    .limit(1);
  if (!investigation) throw new Error("Investigation not found.");

  const listing = investigation.listingSnapshot as Listing;
  const product = investigation.baselineSnapshot as Product | null;

  await db
    .update(investigations)
    .set({ status: "running" })
    .where(and(eq(investigations.workspaceId, actor.workspaceId), eq(investigations.id, investigationId)));

  await updateStage(actor.workspaceId, investigationId, "intake", "running");
  const [existingIntakeEvidence] = await db
    .select({ id: evidenceItems.id })
    .from(evidenceItems)
    .where(and(
      eq(evidenceItems.workspaceId, actor.workspaceId),
      eq(evidenceItems.investigationId, investigationId),
      eq(evidenceItems.fieldName, "listing_snapshot"),
    ))
    .limit(1);
  if (!existingIntakeEvidence) {
    await db.insert(evidenceItems).values({
      workspaceId: actor.workspaceId,
      investigationId,
      providerRunId: null,
      evidenceType: "intake",
      fieldName: "listing_snapshot",
      extractedValue: listing.title ?? "Untitled listing",
      rawObjectKey: null,
      confidenceBasisPoints: Math.round(listing.sourceConfidence * 10_000),
      collectionStatus: "collected",
      provenance: listing.rightsStatus,
      notes: "Persisted user-provided listing snapshot.",
    });
  }
  await updateStage(actor.workspaceId, investigationId, "intake", "succeeded");

  // Do not claim a provider ran when only a private upload exists. The durable
  // state makes the asset available to a later worker and communicates the gap
  // as partial evidence, rather than converting missing data into counterfeit risk.
  const assets = await listPilotCaseAssets(actor.workspaceId, investigation.listingId);
  await updateStage(
    actor.workspaceId,
    investigationId,
    "ocr",
    assets.length ? "partial" : "skipped",
    assets.length ? "Private screenshot is stored; OCR worker has not run yet." : "No private image asset is attached yet.",
  );
  await updateStage(actor.workspaceId, investigationId, "regulatory", "skipped", "No extracted identifier is available for a provider query.");
  await updateStage(
    actor.workspaceId,
    investigationId,
    "visual",
    assets.length ? "partial" : "skipped",
    assets.length ? "Private screenshot is stored; visual comparison worker has not run yet." : "No private image asset and reference comparison are available yet.",
  );

  await updateStage(actor.workspaceId, investigationId, "scoring", "running");
  const score = computeScore(listing, product ?? undefined);
  const snapshot = toScoreSnapshot(score);
  const evidenceSetHash = fingerprint({
    listing,
    product,
    score: snapshot,
    caseAssets: assets.map((asset) => ({ id: asset.id, sha256: asset.sha256 })),
    workflowVersion: "pilot-v1",
  });
  await db
    .insert(scoreSnapshots)
    .values({
      workspaceId: actor.workspaceId,
      investigationId,
      evidenceSetHash,
      ...snapshot,
    })
    .onConflictDoNothing({ target: [scoreSnapshots.investigationId, scoreSnapshots.evidenceSetHash] });
  const [scoreSnapshot] = await db
    .select()
    .from(scoreSnapshots)
    .where(and(
      eq(scoreSnapshots.workspaceId, actor.workspaceId),
      eq(scoreSnapshots.investigationId, investigationId),
      eq(scoreSnapshots.evidenceSetHash, evidenceSetHash),
    ))
    .limit(1);
  if (!scoreSnapshot) throw new Error("Scoring did not create a durable snapshot.");
  await updateStage(actor.workspaceId, investigationId, "scoring", "succeeded");

  await updateStage(actor.workspaceId, investigationId, "judge", "skipped", "Evidence judge is deferred until provider evidence is collected.");
  await updateStage(actor.workspaceId, investigationId, "human_review", "running");
  await db
    .insert(reviewDecisions)
    .values({
      workspaceId: actor.workspaceId,
      investigationId,
      scoreSnapshotId: scoreSnapshot.id,
      status: "pending",
      reviewerUserId: null,
      notes: "Awaiting human review; provider evidence is incomplete.",
      revision: 1,
    })
    .onConflictDoNothing({ target: reviewDecisions.investigationId });
  await updateStage(actor.workspaceId, investigationId, "human_review", "partial", "Human review is required before any case label.");

  await updateStage(actor.workspaceId, investigationId, "report", "running");
  const reportJson = {
    reportVersion: "pilot-v1",
    investigationId,
    listing,
    baseline: product,
    privateCaseAssets: assets.map((asset) => ({
      id: asset.id,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      provenance: asset.provenance,
      createdAt: asset.createdAt.toISOString(),
    })),
    score: compactScore(scoreSnapshot),
    status: "completed_partial",
    limitations: [
      "OCR, regulatory lookup, visual comparison, and judge evidence were not run in this durable intake slice.",
      "Missing evidence lowers confidence and does not itself establish counterfeit risk.",
    ],
  };
  const reportHash = fingerprint(reportJson);
  const [existingReport] = await db
    .select({ id: reportVersions.id })
    .from(reportVersions)
    .where(and(eq(reportVersions.workspaceId, actor.workspaceId), eq(reportVersions.investigationId, investigationId), eq(reportVersions.contentHash, reportHash)))
    .limit(1);
  if (!existingReport) {
    const [latestReport] = await db
      .select({ version: reportVersions.version })
      .from(reportVersions)
      .where(and(eq(reportVersions.workspaceId, actor.workspaceId), eq(reportVersions.investigationId, investigationId)))
      .orderBy(desc(reportVersions.version))
      .limit(1);
    await db.insert(reportVersions).values({
      workspaceId: actor.workspaceId,
      investigationId,
      scoreSnapshotId: scoreSnapshot.id,
      reviewDecisionId: null,
      version: (latestReport?.version ?? 0) + 1,
      reportJson,
      reportObjectKey: null,
      contentHash: reportHash,
      lifecycleStatus: "active",
      retentionUntil: null,
      deletedAt: null,
    });
  }
  await updateStage(actor.workspaceId, investigationId, "report", "partial", "Report is a durable partial-evidence report.");

  await db
    .update(investigations)
    .set({ status: "completed_partial", completedAt: new Date() })
    .where(and(eq(investigations.workspaceId, actor.workspaceId), eq(investigations.id, investigationId)));
  await db.insert(auditEvents).values({
    workspaceId: actor.workspaceId,
    actorUserId: actor.userId,
    action: "investigation.completed_partial",
    entityType: "investigation",
    entityId: investigationId,
    correlationId: investigationId,
    safeMetadata: { scoreSnapshotId: scoreSnapshot.id },
  });

  return getPilotInvestigationState(actor.workspaceId, investigationId);
}

export async function updatePilotReviewDecision({
  workspaceId,
  investigationId,
  reviewerUserId,
  status,
  notes,
}: {
  workspaceId: string;
  investigationId: string;
  reviewerUserId: string;
  status: string;
  notes: string | null;
}): Promise<{ id: string; status: string; revision: number; updatedAt: string }> {
  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(reviewDecisions)
    .where(and(eq(reviewDecisions.workspaceId, workspaceId), eq(reviewDecisions.investigationId, investigationId)))
    .limit(1);
  if (!existing) throw new Error("Review decision not found. Run the investigation first.");

  const [updated] = await db
    .update(reviewDecisions)
    .set({
      status,
      reviewerUserId,
      notes,
      revision: existing.revision + 1,
    })
    .where(and(eq(reviewDecisions.workspaceId, workspaceId), eq(reviewDecisions.id, existing.id)))
    .returning();
  const [latestReport] = await db
    .select()
    .from(reportVersions)
    .where(and(eq(reportVersions.workspaceId, workspaceId), eq(reportVersions.investigationId, investigationId)))
    .orderBy(desc(reportVersions.version))
    .limit(1);
  if (latestReport) {
    const reportJson = {
      ...(latestReport.reportJson as Record<string, unknown>),
      review: { status: updated.status, notes: updated.notes, revision: updated.revision, updatedAt: updated.updatedAt.toISOString() },
    };
    const contentHash = fingerprint(reportJson);
    const [alreadyVersioned] = await db
      .select({ id: reportVersions.id })
      .from(reportVersions)
      .where(and(eq(reportVersions.workspaceId, workspaceId), eq(reportVersions.investigationId, investigationId), eq(reportVersions.contentHash, contentHash)))
      .limit(1);
    if (!alreadyVersioned) {
      await db.insert(reportVersions).values({
        workspaceId,
        investigationId,
        scoreSnapshotId: latestReport.scoreSnapshotId,
        reviewDecisionId: updated.id,
        version: latestReport.version + 1,
        reportJson,
        reportObjectKey: null,
        contentHash,
        lifecycleStatus: "active",
        retentionUntil: latestReport.retentionUntil,
        deletedAt: null,
      });
    }
  }

  await db.insert(auditEvents).values({
    workspaceId,
    actorUserId: reviewerUserId,
    action: "review.updated",
    entityType: "review_decision",
    entityId: updated.id,
    correlationId: investigationId,
    safeMetadata: { status, revision: updated.revision },
  });
  return { id: updated.id, status: updated.status, revision: updated.revision, updatedAt: updated.updatedAt.toISOString() };
}

export async function getPilotReportForListing(workspaceId: string, listingId: string): Promise<{ reportJson: unknown; version: number; createdAt: string } | null> {
  const db = getDatabase();
  const [investigation] = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(and(eq(investigations.workspaceId, workspaceId), eq(investigations.listingId, listingId)))
    .orderBy(desc(investigations.createdAt))
    .limit(1);
  if (!investigation) return null;

  const [report] = await db
    .select()
    .from(reportVersions)
    .where(and(eq(reportVersions.workspaceId, workspaceId), eq(reportVersions.investigationId, investigation.id), eq(reportVersions.lifecycleStatus, "active")))
    .orderBy(desc(reportVersions.createdAt))
    .limit(1);
  return report ? { reportJson: report.reportJson, version: report.version, createdAt: report.createdAt.toISOString() } : null;
}

export async function getPilotInvestigationForListing(workspaceId: string, listingId: string): Promise<PilotInvestigationState | null> {
  const db = getDatabase();
  const [investigation] = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(and(eq(investigations.workspaceId, workspaceId), eq(investigations.listingId, listingId)))
    .orderBy(desc(investigations.createdAt))
    .limit(1);
  return investigation ? getPilotInvestigationState(workspaceId, investigation.id) : null;
}

export async function getPilotInvestigationState(workspaceId: string, investigationId: string): Promise<PilotInvestigationState> {
  const db = getDatabase();
  const [investigation] = await db
    .select()
    .from(investigations)
    .where(and(eq(investigations.workspaceId, workspaceId), eq(investigations.id, investigationId)))
    .limit(1);
  if (!investigation) throw new Error("Investigation not found.");

  const stageRows = await db
    .select()
    .from(investigationStages)
    .where(and(eq(investigationStages.workspaceId, workspaceId), eq(investigationStages.investigationId, investigationId)))
    .orderBy(asc(investigationStages.createdAt));
  const evidence = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.workspaceId, workspaceId), eq(evidenceItems.investigationId, investigationId)))
    .orderBy(asc(evidenceItems.createdAt));
  const [score] = await db
    .select()
    .from(scoreSnapshots)
    .where(and(eq(scoreSnapshots.workspaceId, workspaceId), eq(scoreSnapshots.investigationId, investigationId)))
    .orderBy(desc(scoreSnapshots.createdAt))
    .limit(1);
  const [review] = await db
    .select()
    .from(reviewDecisions)
    .where(and(eq(reviewDecisions.workspaceId, workspaceId), eq(reviewDecisions.investigationId, investigationId)))
    .orderBy(desc(reviewDecisions.updatedAt))
    .limit(1);
  const [report] = await db
    .select()
    .from(reportVersions)
    .where(and(eq(reportVersions.workspaceId, workspaceId), eq(reportVersions.investigationId, investigationId)))
    .orderBy(desc(reportVersions.createdAt))
    .limit(1);

  return {
    investigation: mapInvestigation(investigation),
    stages: stageRows.map(mapStage),
    evidence: evidence.map((item) => ({
      id: item.id,
      evidenceType: item.evidenceType,
      fieldName: item.fieldName,
      extractedValue: item.extractedValue,
      confidence: item.confidenceBasisPoints == null ? null : item.confidenceBasisPoints / 10_000,
      collectionStatus: item.collectionStatus,
      provenance: item.provenance,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
    })),
    score: score ? compactScore(score) : null,
    review: review ? { id: review.id, status: review.status, revision: review.revision, updatedAt: review.updatedAt.toISOString() } : null,
    report: report ? { id: report.id, version: report.version, lifecycleStatus: report.lifecycleStatus, createdAt: report.createdAt.toISOString() } : null,
  };
}

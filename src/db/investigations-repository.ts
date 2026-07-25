import { createHash } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";

import { computeScore, SCORING_VERSION } from "@/domain/scoring";
import type { Evidence, Listing, Product, Score } from "@/domain/types";
import { runLlmJudge } from "@/lib/llm-judge";
import { processMistralOcr } from "@/lib/mistral-ocr";
import { privateImageDataUrl } from "@/lib/private-case-assets";
import { enrichRegulatoryCheckWithBpomApi, inferRegulatoryCheck } from "@/lib/regulatory-check";
import { inferVisualMatch } from "@/lib/visual-compare";

import { getDatabase } from "./index";
import { listPilotCaseAssets } from "./case-assets-repository";
import {
  auditEvents,
  evidenceItems,
  investigations,
  investigationStages,
  outboxEvents,
  providerRuns,
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

async function createProviderRun({
  workspaceId,
  investigationId,
  stage,
  provider,
  mode,
  outcome,
  requestFingerprint,
  safeError,
}: {
  workspaceId: string;
  investigationId: string;
  stage: Stage;
  provider: string;
  mode: "live" | "mock" | "unavailable";
  outcome: "matched" | "no_match" | "partial" | "failed" | "skipped";
  requestFingerprint: string;
  safeError: string | null;
}) {
  const db = getDatabase();
  const [stageRow] = await db
    .select({ id: investigationStages.id })
    .from(investigationStages)
    .where(and(
      eq(investigationStages.workspaceId, workspaceId),
      eq(investigationStages.investigationId, investigationId),
      eq(investigationStages.stage, stage),
    ))
    .limit(1);
  if (!stageRow) throw new Error(`Missing durable stage ${stage}.`);

  await db
    .insert(providerRuns)
    .values({
      workspaceId,
      investigationStageId: stageRow.id,
      provider,
      providerVersion: null,
      mode,
      outcome,
      requestFingerprint,
      safeError,
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .onConflictDoNothing({ target: [providerRuns.investigationStageId, providerRuns.requestFingerprint] });

  const [run] = await db
    .select()
    .from(providerRuns)
    .where(and(eq(providerRuns.investigationStageId, stageRow.id), eq(providerRuns.requestFingerprint, requestFingerprint)))
    .limit(1);
  if (!run) throw new Error(`Provider run ${provider} did not persist.`);
  return run;
}

async function persistProviderEvidence({
  workspaceId,
  investigationId,
  providerRunId,
  evidenceType,
  fieldName,
  extractedValue,
  confidence,
  collectionStatus,
  provenance,
  notes,
}: {
  workspaceId: string;
  investigationId: string;
  providerRunId: string;
  evidenceType: string;
  fieldName: string;
  extractedValue: string | null;
  confidence: number | null;
  collectionStatus: "collected" | "unavailable" | "failed" | "not_requested";
  provenance: string;
  notes: string | null;
}) {
  const db = getDatabase();
  await db
    .insert(evidenceItems)
    .values({
      workspaceId,
      investigationId,
      providerRunId,
      evidenceType,
      fieldName,
      extractedValue,
      rawObjectKey: null,
      confidenceBasisPoints: confidence == null ? null : Math.round(confidence * 10_000),
      collectionStatus,
      provenance,
      notes,
    })
    .onConflictDoNothing({ target: [evidenceItems.investigationId, evidenceItems.providerRunId, evidenceItems.fieldName] });
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

  const assets = await listPilotCaseAssets(actor.workspaceId, investigation.listingId);
  let ocrArtifact: import("@/domain/types").OcrArtifact | undefined;
  let regulatory: import("@/domain/types").RegulatoryCheck | undefined;

  if (!assets.length) {
    await updateStage(actor.workspaceId, investigationId, "ocr", "skipped", "No private image asset is attached yet.");
  } else {
    await updateStage(actor.workspaceId, investigationId, "ocr", "running");
    const asset = assets[0];
    try {
      const imageDataUrl = await privateImageDataUrl({ objectKey: asset.objectKey, contentType: asset.contentType });
      const ocrResult = await processMistralOcr({ listingId: listing.id, imageUrl: imageDataUrl });
      const run = await createProviderRun({
        workspaceId: actor.workspaceId,
        investigationId,
        stage: "ocr",
        provider: ocrResult.provider,
        mode: ocrResult.provider === "mistral" && ocrResult.status === "completed" ? "live" : ocrResult.provider === "mock" ? "mock" : "unavailable",
        outcome: ocrResult.status === "completed" ? "matched" : "failed",
        requestFingerprint: fingerprint({ asset: asset.sha256, provider: "mistral-ocr", model: ocrResult.model }),
        safeError: ocrResult.error,
      });
      await persistProviderEvidence({
        workspaceId: actor.workspaceId,
        investigationId,
        providerRunId: run.id,
        evidenceType: "ocr",
        fieldName: "ocr_markdown",
        extractedValue: ocrResult.markdown || null,
        confidence: ocrResult.averageConfidence,
        collectionStatus: ocrResult.status === "completed" ? "collected" : "failed",
        provenance: ocrResult.provider === "mistral" ? "live_mistral_ocr" : "mock_ocr_fixture",
        notes: ocrResult.error,
      });
      if (ocrResult.parsedFields.bpomNie) {
        await persistProviderEvidence({
          workspaceId: actor.workspaceId,
          investigationId,
          providerRunId: run.id,
          evidenceType: "ocr_packaging_field",
          fieldName: "ocr_bpom_nie",
          extractedValue: ocrResult.parsedFields.bpomNie,
          confidence: ocrResult.averageConfidence,
          collectionStatus: ocrResult.status === "completed" ? "collected" : "failed",
          provenance: ocrResult.provider === "mistral" ? "live_mistral_ocr" : "mock_ocr_fixture",
          notes: null,
        });
      }
      ocrArtifact = {
        ...ocrResult,
        id: run.id,
        listingId: listing.id,
        createdAt: new Date().toISOString(),
      };
      await updateStage(actor.workspaceId, investigationId, "ocr", ocrResult.status === "completed" ? "succeeded" : "partial", ocrResult.error);
    } catch (error) {
      const safeError = error instanceof Error ? error.message : "Private OCR could not complete.";
      const run = await createProviderRun({
        workspaceId: actor.workspaceId,
        investigationId,
        stage: "ocr",
        provider: "mistral",
        mode: "unavailable",
        outcome: "failed",
        requestFingerprint: fingerprint({ asset: asset.sha256, provider: "mistral-ocr" }),
        safeError,
      });
      await persistProviderEvidence({
        workspaceId: actor.workspaceId,
        investigationId,
        providerRunId: run.id,
        evidenceType: "ocr",
        fieldName: "ocr_markdown",
        extractedValue: null,
        confidence: null,
        collectionStatus: "failed",
        provenance: "mistral_ocr_unavailable",
        notes: safeError,
      });
      await updateStage(actor.workspaceId, investigationId, "ocr", "partial", safeError);
    }
  }

  await updateStage(actor.workspaceId, investigationId, "regulatory", "running");
  const regulatoryBase = inferRegulatoryCheck(listing, product ?? undefined, ocrArtifact);
  const enrichedRegulatory = await enrichRegulatoryCheckWithBpomApi(regulatoryBase, product?.name ?? null);
  const regulatoryRun = await createProviderRun({
    workspaceId: actor.workspaceId,
    investigationId,
    stage: "regulatory",
    provider: enrichedRegulatory.provider,
    mode: enrichedRegulatory.provider === "bpom_api" ? "live" : "unavailable",
    outcome: enrichedRegulatory.status === "verified_active" || enrichedRegulatory.status === "match" ? "matched" : enrichedRegulatory.status === "not_found" ? "no_match" : "partial",
    requestFingerprint: fingerprint({ extractedNie: enrichedRegulatory.extractedNie, expectedNie: enrichedRegulatory.expectedNie, provider: enrichedRegulatory.provider }),
    safeError: enrichedRegulatory.provider === "bpom_api" ? null : enrichedRegulatory.notes,
  });
  await persistProviderEvidence({
    workspaceId: actor.workspaceId,
    investigationId,
    providerRunId: regulatoryRun.id,
    evidenceType: "regulatory",
    fieldName: "regulatory_status",
    extractedValue: enrichedRegulatory.status,
    confidence: enrichedRegulatory.provider === "bpom_api" ? 0.9 : null,
    collectionStatus: enrichedRegulatory.provider === "bpom_api" ? "collected" : "unavailable",
    provenance: enrichedRegulatory.provider === "bpom_api" ? `live_bpom_query:${enrichedRegulatory.status}` : "bpom_query_unavailable",
    notes: enrichedRegulatory.notes,
  });
  regulatory = {
    ...enrichedRegulatory,
    id: regulatoryRun.id,
    createdAt: new Date().toISOString(),
  };
  await updateStage(actor.workspaceId, investigationId, "regulatory", enrichedRegulatory.provider === "bpom_api" ? "succeeded" : "partial", enrichedRegulatory.provider === "bpom_api" ? null : enrichedRegulatory.notes);

  const visualError = assets.length ? "Private screenshot is stored; production visual-comparison adapter is unavailable." : "No private image asset and reference comparison are available yet.";
  const visualRun = await createProviderRun({
    workspaceId: actor.workspaceId,
    investigationId,
    stage: "visual",
    provider: "visual_adapter",
    mode: "unavailable",
    outcome: "partial",
    requestFingerprint: fingerprint({ assets: assets.map((asset) => asset.sha256), baselineImages: product?.officialImageUrls ?? [] }),
    safeError: visualError,
  });
  await persistProviderEvidence({
    workspaceId: actor.workspaceId,
    investigationId,
    providerRunId: visualRun.id,
    evidenceType: "visual_comparison",
    fieldName: "visual_status",
    extractedValue: "unavailable",
    confidence: null,
    collectionStatus: "unavailable",
    provenance: "visual_comparison_unavailable",
    notes: visualError,
  });
  await updateStage(actor.workspaceId, investigationId, "visual", "partial", visualError);

  await updateStage(actor.workspaceId, investigationId, "scoring", "running");
  const score = computeScore(listing, product ?? undefined, ocrArtifact, regulatory);
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

  await updateStage(actor.workspaceId, investigationId, "judge", "running");
  const judgeEvidenceRows = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.workspaceId, actor.workspaceId), eq(evidenceItems.investigationId, investigationId)))
    .orderBy(asc(evidenceItems.createdAt));
  const judgeEvidence: Evidence[] = judgeEvidenceRows.map((item) => ({
    id: item.id,
    listingId: listing.id,
    evidenceType: item.evidenceType,
    fieldName: item.fieldName,
    extractedValue: item.extractedValue ?? "",
    rawValue: null,
    confidence: item.confidenceBasisPoints == null ? null : item.confidenceBasisPoints / 10_000,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
  }));
  const scoreForJudge: Score = {
    ...score,
    id: scoreSnapshot.id,
    listingId: listing.id,
    createdAt: scoreSnapshot.createdAt.toISOString(),
  };
  const judgeResult = await runLlmJudge({
    listing,
    product: product ?? undefined,
    score: scoreForJudge,
    evidence: judgeEvidence,
    regulatory,
  });
  const judgeRun = await createProviderRun({
    workspaceId: actor.workspaceId,
    investigationId,
    stage: "judge",
    provider: judgeResult.provider,
    mode: judgeResult.provider === "mock" ? "mock" : "live",
    outcome: judgeResult.judgeRisk === "insufficient_evidence" ? "partial" : "matched",
    requestFingerprint: fingerprint({ scoreSnapshotId: scoreSnapshot.id, evidence: judgeEvidence.map((item) => item.id), provider: judgeResult.provider }),
    safeError: judgeResult.error,
  });
  await persistProviderEvidence({
    workspaceId: actor.workspaceId,
    investigationId,
    providerRunId: judgeRun.id,
    evidenceType: "judge_assessment",
    fieldName: "judge_assessment",
    extractedValue: JSON.stringify({
      judgeRisk: judgeResult.judgeRisk,
      confidence: judgeResult.confidence,
      supportedReasons: judgeResult.supportedReasons,
      missingEvidence: judgeResult.missingEvidence,
      citedEvidenceIds: judgeResult.citedEvidenceIds,
      doNotClaimReasons: judgeResult.doNotClaimReasons,
    }),
    confidence: judgeResult.confidence === "high" ? 0.8 : judgeResult.confidence === "medium" ? 0.55 : 0.3,
    collectionStatus: judgeResult.provider === "mock" ? "unavailable" : "collected",
    provenance: judgeResult.provider === "mock" ? "mock_judge_fallback" : `live_${judgeResult.provider}_judge`,
    notes: judgeResult.error,
  });
  await updateStage(actor.workspaceId, investigationId, "judge", judgeResult.provider === "mock" || judgeResult.judgeRisk === "insufficient_evidence" ? "partial" : "succeeded", judgeResult.error ?? (judgeResult.provider === "mock" ? "Live judge unavailable; mock diagnostic output is clearly labeled." : null));

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
      ocrArtifact?.status === "completed" ? null : "OCR evidence is unavailable or partial.",
      regulatory?.provider === "bpom_api" ? null : "Live BPOM verification is unavailable or requires manual confirmation.",
      "Production visual comparison is unavailable; no visual mismatch claim was made.",
      judgeResult.provider === "mock" ? "Evidence judge used a clearly labeled mock fallback." : null,
      "Missing evidence lowers confidence and does not itself establish counterfeit risk.",
    ].filter((value): value is string => Boolean(value)),
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

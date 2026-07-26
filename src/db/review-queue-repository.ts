import { desc, eq } from "drizzle-orm";

import { getDatabase } from "./index";
import { investigations, reviewDecisions, scoreSnapshots } from "./schema";

export type PilotReviewQueueItem = {
  id: string;
  investigationId: string;
  listingId: string;
  scoreId: string | null;
  status: string;
  reviewer: string | null;
  notes: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  listing: { title: string; price: number | null; sellerName: string | null; marketplace: string | null };
  score: { totalScore: number; riskLevel: string; confidence: string; recommendedAction: string; reasons: unknown } | null;
};

export async function listPilotReviewQueue(workspaceId: string): Promise<PilotReviewQueueItem[]> {
  const db = getDatabase();
  const decisions = await db
    .select()
    .from(reviewDecisions)
    .where(eq(reviewDecisions.workspaceId, workspaceId))
    .orderBy(desc(reviewDecisions.updatedAt));

  const items: PilotReviewQueueItem[] = [];
  for (const decision of decisions) {
    const [investigation] = await db
      .select()
      .from(investigations)
      .where(eq(investigations.id, decision.investigationId))
      .limit(1);
    if (!investigation || investigation.workspaceId !== workspaceId) continue;
    const [score] = decision.scoreSnapshotId
      ? await db.select().from(scoreSnapshots).where(eq(scoreSnapshots.id, decision.scoreSnapshotId)).limit(1)
      : [undefined];
    const listing = investigation.listingSnapshot as { title?: string; price?: number | null; sellerName?: string | null; marketplace?: string | null };
    items.push({
      id: decision.id,
      investigationId: decision.investigationId,
      listingId: investigation.listingId,
      scoreId: decision.scoreSnapshotId,
      status: decision.status,
      reviewer: decision.reviewerUserId,
      notes: decision.notes,
      revision: decision.revision,
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
      listing: {
        title: listing.title ?? "Untitled listing",
        price: listing.price ?? null,
        sellerName: listing.sellerName ?? null,
        marketplace: listing.marketplace ?? null,
      },
      score: score ? {
        totalScore: score.riskScore,
        riskLevel: score.riskLevel,
        confidence: score.confidence,
        recommendedAction: score.recommendedAction,
        reasons: score.reasons,
      } : null,
    });
  }
  return items;
}

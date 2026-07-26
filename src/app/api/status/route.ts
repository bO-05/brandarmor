import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db";
import { investigations, listings as pilotListings, reviewDecisions, scoreSnapshots } from "@/db/schema";
import { getListings, getReviewDecisions, getScores } from "@/persistence/store";
import { getEvaluationFixtureCount } from "@/evaluation/dataset";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import type { AmbientStatusInput } from "@/lib/ui-ux";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePilotWriteActor(request);
    if (!access.allowed) return access.response;
    if (access.actor?.workspaceId) {
      const db = getDatabase();
      const [workspaceListings, workspaceInvestigations, workspaceScores, workspaceReviews] = await Promise.all([
        db.select().from(pilotListings).where(eq(pilotListings.workspaceId, access.actor.workspaceId)),
        db.select().from(investigations).where(eq(investigations.workspaceId, access.actor.workspaceId)),
        db.select().from(scoreSnapshots).where(eq(scoreSnapshots.workspaceId, access.actor.workspaceId)),
        db.select().from(reviewDecisions).where(eq(reviewDecisions.workspaceId, access.actor.workspaceId)),
      ]);
      const scoredInvestigationIds = new Set(workspaceScores.map((score) => score.investigationId));
      const scoredListingIds = new Set(workspaceInvestigations.filter((investigation) => scoredInvestigationIds.has(investigation.id)).map((investigation) => investigation.listingId));
      const status: AmbientStatusInput = {
        listingCount: workspaceListings.length,
        unlinkedListingCount: workspaceListings.filter((listing) => !listing.productBaselineId).length,
        unscoredListingCount: workspaceListings.filter((listing) => !scoredListingIds.has(listing.id)).length,
        pendingReviewCount: workspaceReviews.filter((review) => review.status === "pending").length,
        highRiskScoreCount: workspaceScores.filter((score) => score.riskLevel === "high" || score.riskLevel === "critical").length,
        evaluationCaseCount: 0,
        reviewDecisionCount: workspaceReviews.length,
      };
      return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    ensureDemoSeeded();
    const listings = getListings();
    const scores = getScores();
    const reviews = getReviewDecisions();
    const scoredListingIds = new Set(scores.map((score) => score.listingId));

    const status: AmbientStatusInput = {
      listingCount: listings.length,
      unlinkedListingCount: listings.filter((listing) => !listing.productId).length,
      unscoredListingCount: listings.filter((listing) => !scoredListingIds.has(listing.id)).length,
      pendingReviewCount: reviews.filter((review) => review.status === "pending").length,
      highRiskScoreCount: scores.filter((score) => score.riskLevel === "high" || score.riskLevel === "critical").length,
      evaluationCaseCount: getEvaluationFixtureCount(),
      reviewDecisionCount: reviews.length,
    };

    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getListings, getReviewDecisions, getScores } from "@/persistence/store";
import { getEvaluationFixtureCount } from "@/evaluation/dataset";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import type { AmbientStatusInput } from "@/lib/ui-ux";

export async function GET() {
  try {
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

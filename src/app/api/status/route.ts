import { NextResponse } from "next/server";
import { getEvaluationCases, getListings, getReviewDecisions, getScores } from "@/persistence/store";
import type { AmbientStatusInput } from "@/lib/ui-ux";

export async function GET() {
  try {
    const listings = getListings();
    const scores = getScores();
    const reviews = getReviewDecisions();
    const evaluationCases = getEvaluationCases();
    const scoredListingIds = new Set(scores.map((score) => score.listingId));

    const status: AmbientStatusInput = {
      listingCount: listings.length,
      unlinkedListingCount: listings.filter((listing) => !listing.productId).length,
      unscoredListingCount: listings.filter((listing) => !scoredListingIds.has(listing.id)).length,
      pendingReviewCount: reviews.filter((review) => review.status === "pending").length,
      highRiskScoreCount: scores.filter((score) => score.riskLevel === "high" || score.riskLevel === "critical").length,
      evaluationCaseCount: evaluationCases.length,
      reviewDecisionCount: reviews.length,
    };

    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

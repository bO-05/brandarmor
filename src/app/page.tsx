import DashboardPage from "./page-client";
import { hasEnvValue } from "@/lib/env";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { getBrands, getEvaluationCases, getListings, getProducts, getReviewDecisions, getScores, isDataDirWritable } from "@/persistence/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "BrandArmor Workspace",
  description: "Workspace status for evidence-backed suspicious listing review.",
};

export default function Page() {
  // Self-heal an empty serverless workspace so the landing page is never blank.
  ensureDemoSeeded();

  const listings = getListings();
  const scores = getScores();
  const reviews = getReviewDecisions();
  const scoredListingIds = new Set(scores.map((score) => score.listingId));
  const brandCount = getBrands().length;
  const productCount = getProducts().length;
  const listingCount = listings.length;
  const dataWritable = isDataDirWritable();

  return (
    <DashboardPage
      initialData={{
        brands: brandCount,
        listings: listingCount,
        unlinkedListings: listings.filter((listing) => !listing.productId).length,
        unscoredListings: listings.filter((listing) => !scoredListingIds.has(listing.id)).length,
        pendingReviews: reviews.filter((review) => review.status === "pending").length,
        highRisk: scores.filter((score) => score.riskLevel === "high" || score.riskLevel === "critical").length,
        reviewDecisions: reviews.length,
        evaluationCases: getEvaluationCases().length,
        readiness: {
          mistralConfigured: hasEnvValue("MISTRAL_API_KEY"),
          anthropicConfigured: hasEnvValue("ANTHROPIC_API_KEY"),
          dataWritable,
          demoReady: dataWritable && brandCount > 0 && productCount > 0 && listingCount > 0,
        },
      }}
    />
  );
}

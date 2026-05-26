import { NextResponse } from "next/server";
import { visualCompareRequestSchema } from "@/domain/schemas";
import { computeScore } from "@/domain/scoring";
import { inferVisualMatch } from "@/lib/visual-compare";
import { createEvidence, createScore, createVisualMatch, enrichScoreReasons, getLatestOcrArtifact, getLatestRegulatoryCheck, getListing, getProduct, getVisualMatches } from "@/persistence/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(getVisualMatches(searchParams.get("listingId") ?? undefined));
}

export async function POST(request: Request) {
  try {
    const parsed = visualCompareRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const listing = getListing(parsed.data.listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const visual = createVisualMatch(inferVisualMatch(listing, product, parsed.data));
    createEvidence({
      listingId: listing.id,
      evidenceType: "visual_similarity",
      fieldName: "visual_similarity",
      extractedValue: visual.similarityScore == null ? "not_available" : String(visual.similarityScore),
      rawValue: JSON.stringify(visual),
      confidence: visual.similarityScore,
      notes: visual.evidenceSummary,
    });
    const score = product ? createScore({ ...enrichScoreReasons(computeScore(listing, product, getLatestOcrArtifact(listing.id), getLatestRegulatoryCheck(listing.id), visual), listing.id), listingId: listing.id }) : null;
    return NextResponse.json({ visualMatch: visual, score }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { enrichScoreReasons, getEvidence, getLatestOcrArtifact, getLatestRegulatoryCheck, getLatestVisualMatch, getScore, getScores, createScore, getListing, getProduct } from "@/persistence/store";
import { computeScore } from "@/domain/scoring";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    if (listingId) {
      const score = getScore(listingId);
      if (!score) return NextResponse.json({ error: "Score not found" }, { status: 404 });
      return NextResponse.json(score);
    }
    const scores = getScores();
    return NextResponse.json(scores);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId } = body;
    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }
    const listing = getListing(listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const score = computeScore(listing, product, getLatestOcrArtifact(listing.id), getLatestRegulatoryCheck(listing.id), getLatestVisualMatch(listing.id));
    const created = createScore({ ...enrichScoreReasons(score, listing.id), listingId });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

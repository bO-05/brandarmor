import { NextResponse } from "next/server";
import { computeScore } from "@/domain/scoring";
import { inferRegulatoryCheck } from "@/lib/regulatory-check";
import { inferVisualMatch } from "@/lib/visual-compare";
import { runLlmJudge } from "@/lib/llm-judge";
import { createEvidence, createLlmJudgeAssessment, createRegulatoryCheck, createScore, createVisualMatch, enrichScoreReasons, getEvidence, getLatestOcrArtifact, getListing, getProduct } from "@/persistence/store";

export async function POST(request: Request) {
  try {
    const { listingId, forceMockJudge = false } = await request.json();
    if (!listingId) return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    const listing = getListing(listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const ocr = getLatestOcrArtifact(listing.id);
    const regulatory = createRegulatoryCheck(inferRegulatoryCheck(listing, product, ocr));
    const visual = createVisualMatch(inferVisualMatch(listing, product));
    createEvidence({ listingId: listing.id, evidenceType: "regulatory_check", fieldName: "regulatory_status", extractedValue: regulatory.status, rawValue: JSON.stringify(regulatory), confidence: 0.5, notes: regulatory.sourceUrl });
    createEvidence({ listingId: listing.id, evidenceType: "visual_similarity", fieldName: "visual_similarity", extractedValue: visual.similarityScore == null ? "not_available" : String(visual.similarityScore), rawValue: JSON.stringify(visual), confidence: visual.similarityScore, notes: visual.evidenceSummary });
    const score = createScore({ ...enrichScoreReasons(computeScore(listing, product, ocr, regulatory, visual), listing.id), listingId: listing.id });
    const judge = await runLlmJudge({ listing, product, score, ocr, evidence: getEvidence(listing.id), regulatory, visual }, forceMockJudge);
    const assessment = createLlmJudgeAssessment({ listingId: listing.id, scoreId: score.id, ...judge });
    return NextResponse.json({ regulatory, visual, score, judge: assessment }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { ocrRequestSchema } from "@/domain/schemas";
import { computeScore } from "@/domain/scoring";
import { processMistralOcr } from "@/lib/mistral-ocr";
import {
  clearOcrEvidenceForListing,
  createEvidence,
  createOcrArtifact,
  createReviewDecision,
  createScore,
  enrichScoreReasons,
  getLatestOcrArtifact,
  getLatestRegulatoryCheck,
  getLatestVisualMatch,
  getListing,
  getOcrArtifacts,
  getProduct,
  getScore,
  updateListing,
} from "@/persistence/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  return NextResponse.json(getOcrArtifacts(listingId ?? undefined));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ocrRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const listing = getListing(parsed.data.listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const imageUrl = parsed.data.imageUrl ?? listing.screenshotUrl ?? listing.imageUrls[0];
    if (!imageUrl) return NextResponse.json({ error: "OCR needs imageUrl, screenshotUrl, or listing imageUrls[0]" }, { status: 400 });

    updateListing(listing.id, { ocrStatus: "pending", ocrRequestedAt: new Date().toISOString() });
    const result = await processMistralOcr({ listingId: listing.id, imageUrl, forceMock: parsed.data.forceMock });
    const artifact = createOcrArtifact({ listingId: listing.id, ...result });

    if (artifact.status === "completed") {
      clearOcrEvidenceForListing(listing.id);
      createEvidence({
        listingId: listing.id,
        evidenceType: "ocr_markdown",
        fieldName: "ocr_markdown",
        extractedValue: artifact.markdown,
        rawValue: JSON.stringify(artifact.rawJson),
        confidence: artifact.averageConfidence,
        notes: `${artifact.provider}:${artifact.model}`,
      });
      if (artifact.parsedFields.bpomNie) {
        createEvidence({
          listingId: listing.id,
          evidenceType: "ocr_packaging_field",
          fieldName: "ocr_bpom_nie",
          extractedValue: artifact.parsedFields.bpomNie,
          rawValue: JSON.stringify(artifact.parsedFields),
          confidence: artifact.averageConfidence,
          notes: "BPOM/NIE-like cosmetics registration identifier extracted from OCR",
        });
      }
      if (artifact.parsedFields.volumeOrSize) {
        createEvidence({ listingId: listing.id, evidenceType: "ocr_packaging_field", fieldName: "ocr_volume_or_size", extractedValue: artifact.parsedFields.volumeOrSize, rawValue: JSON.stringify(artifact.parsedFields), confidence: artifact.averageConfidence, notes: "Cosmetics package volume/size extracted from OCR" });
      }
      if (artifact.parsedFields.ingredientsText) {
        createEvidence({ listingId: listing.id, evidenceType: "ocr_packaging_field", fieldName: "ocr_ingredients", extractedValue: artifact.parsedFields.ingredientsText, rawValue: JSON.stringify(artifact.parsedFields), confidence: artifact.averageConfidence, notes: "Ingredients/composition text extracted from OCR" });
      }
      if (artifact.parsedFields.claims.length) {
        createEvidence({ listingId: listing.id, evidenceType: "ocr_packaging_field", fieldName: "ocr_claims", extractedValue: artifact.parsedFields.claims.join(" | "), rawValue: JSON.stringify(artifact.parsedFields), confidence: artifact.averageConfidence, notes: "Cosmetics claims extracted from OCR" });
      }
      createEvidence({
        listingId: listing.id,
        evidenceType: "ocr_signal",
        fieldName: "ocr_suspicious_terms",
        extractedValue: String(artifact.suspiciousTermCount),
        rawValue: JSON.stringify(artifact.extractedFields),
        confidence: artifact.averageConfidence,
        notes: "Count of OCR-visible counterfeit/suspicious terms",
      });
    }

    const updated = updateListing(listing.id, {
      ocrStatus: artifact.status,
      ocrCompletedAt: new Date().toISOString(),
    });
    const product = updated?.productId ? getProduct(updated.productId) : undefined;
    let score = null;
    if (updated && product) {
      const existingScore = getScore(updated.id);
      const computed = computeScore(updated, product, getLatestOcrArtifact(updated.id), getLatestRegulatoryCheck(updated.id), getLatestVisualMatch(updated.id));
      const enriched = enrichScoreReasons(computed, updated.id);
      score = createScore({ ...enriched, listingId: updated.id });
      if (score.recommendedAction !== "ignore" && !existingScore) {
        createReviewDecision({ listingId: updated.id, scoreId: score.id, status: "pending" });
      }
    }

    return NextResponse.json({ artifact, listing: updated, score }, { status: artifact.status === "failed" ? 502 : 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

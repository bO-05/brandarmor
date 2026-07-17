import { NextResponse } from "next/server";
import { computeScore } from "@/domain/scoring";
import { processMistralOcr } from "@/lib/mistral-ocr";
import { enrichRegulatoryCheckWithBpomApi, inferRegulatoryCheck } from "@/lib/regulatory-check";
import { inferVisualMatch } from "@/lib/visual-compare";
import { hasEnvValue } from "@/lib/env";
import { elapsedMs } from "@/lib/provider-safety";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import {
  clearGeneratedEvidenceForListing,
  clearLlmJudgeAssessmentsForListing,
  createEvidence,
  createOcrArtifact,
  createRegulatoryCheck,
  createReviewDecision,
  createScore,
  createVisualMatch,
  enrichScoreReasons,
  getListings,
  getProduct,
  getReviewDecision,
  seedDemoData,
  updateListing,
} from "@/persistence/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function chooseDemoListing() {
  const listings = getListings();
  return listings.find((listing) => /share in jar|no bpom|murah/i.test(listing.title ?? "")) ?? listings[0] ?? null;
}

function safeDemoError(): string {
  return "The demo evidence path could not finish. Retry the demo; provider fallbacks remain clearly labeled when available.";
}

export async function POST() {
  const startedAt = performance.now();

  try {
    ensureDemoSeeded();
    seedDemoData();
    const listing = chooseDemoListing();
    if (!listing) return NextResponse.json({ error: "Demo seed did not create a listing" }, { status: 500 });

    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const imageUrl = listing.screenshotUrl ?? listing.imageUrls[0] ?? "https://example.com/somethinc-demo-suspect.png";
    const useMockOcr = !hasEnvValue("MISTRAL_API_KEY") || imageUrl.includes("example.com");
    const timings: Record<string, number> = {};

    clearGeneratedEvidenceForListing(listing.id);
    clearLlmJudgeAssessmentsForListing(listing.id);

    updateListing(listing.id, { ocrStatus: "pending", ocrRequestedAt: new Date().toISOString() });
    const ocrStartedAt = performance.now();
    const ocrResult = await processMistralOcr({ listingId: listing.id, imageUrl, forceMock: useMockOcr });
    timings.ocr = elapsedMs(ocrStartedAt);
    const ocr = createOcrArtifact({ listingId: listing.id, ...ocrResult });
    updateListing(listing.id, { ocrStatus: ocr.status, ocrCompletedAt: new Date().toISOString() });

    if (ocr.status === "completed") {
      createEvidence({
        listingId: listing.id,
        evidenceType: "ocr_markdown",
        fieldName: "ocr_markdown",
        extractedValue: ocr.markdown,
        rawValue: JSON.stringify(ocr.rawJson),
        confidence: ocr.averageConfidence,
        notes: `${ocr.provider}:${ocr.model}`,
      });
      for (const [fieldName, value] of Object.entries({
        ocr_bpom_nie: ocr.parsedFields.bpomNie,
        ocr_volume_or_size: ocr.parsedFields.volumeOrSize,
        ocr_ingredients: ocr.parsedFields.ingredientsText,
        ocr_claims: ocr.parsedFields.claims.join(" | ") || null,
      })) {
        if (!value) continue;
        createEvidence({
          listingId: listing.id,
          evidenceType: "ocr_packaging_field",
          fieldName,
          extractedValue: value,
          rawValue: JSON.stringify(ocr.parsedFields),
          confidence: ocr.averageConfidence,
          notes: "Extracted during the guided demo core stage",
        });
      }
    }

    const regulatoryStartedAt = performance.now();
    const baseRegulatory = inferRegulatoryCheck(listing, product, ocr);
    const enrichedRegulatory = process.env.BPOM_DISABLE_API
      ? baseRegulatory
      : await enrichRegulatoryCheckWithBpomApi(baseRegulatory, product?.name ?? null);
    timings.regulatory = elapsedMs(regulatoryStartedAt);
    const regulatory = createRegulatoryCheck(enrichedRegulatory);

    const visualStartedAt = performance.now();
    const visual = createVisualMatch(inferVisualMatch(listing, product));
    timings.visual = elapsedMs(visualStartedAt);

    createEvidence({
      listingId: listing.id,
      evidenceType: "regulatory_check",
      fieldName: "regulatory_status",
      extractedValue: regulatory.status,
      rawValue: JSON.stringify(regulatory),
      confidence: regulatory.status === "match" || regulatory.status === "mismatch" ? 0.9 : 0.45,
      notes: regulatory.sourceUrl,
    });
    createEvidence({
      listingId: listing.id,
      evidenceType: "visual_similarity",
      fieldName: "visual_similarity",
      extractedValue: visual.similarityScore == null ? "not_available" : String(visual.similarityScore),
      rawValue: JSON.stringify(visual),
      confidence: visual.similarityScore,
      notes: visual.evidenceSummary,
    });

    const scoreStartedAt = performance.now();
    const score = createScore({
      ...enrichScoreReasons(computeScore(listing, product, ocr, regulatory, visual), listing.id),
      listingId: listing.id,
    });
    timings.scoring = elapsedMs(scoreStartedAt);

    if (score.recommendedAction !== "ignore" && !getReviewDecision(listing.id)) {
      createReviewDecision({ listingId: listing.id, scoreId: score.id, status: "pending" });
    }

    timings.core = elapsedMs(startedAt);
    return NextResponse.json({
      listingId: listing.id,
      listingUrl: `/listings/${listing.id}`,
      usedMockOcr: useMockOcr,
      nextStep: {
        id: "judge",
        endpoint: "/api/judge",
        label: "Run evidence judge",
      },
      status: {
        ocrProvider: ocr.provider,
        usedMockOcr: useMockOcr,
        regulatoryProvider: regulatory.provider,
        regulatoryStatus: regulatory.status,
        bpomStatus: regulatory.bpomStatus ?? null,
        bpomLookupDurationMs: regulatory.bpomLookupDurationMs ?? null,
        visualProvider: visual.provider,
        visualStatus: visual.status,
      },
      timings,
      ocr,
      regulatory,
      visual,
      score,
      reviewUrl: "/review",
      evaluationUrl: "/evaluation",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: safeDemoError() }, { status: 500 });
  }
}

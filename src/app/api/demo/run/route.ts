import { NextResponse } from "next/server";
import { computeScore } from "@/domain/scoring";
import { runLlmJudge } from "@/lib/llm-judge";
import { processMistralOcr } from "@/lib/mistral-ocr";
import { enrichRegulatoryCheckWithBpomApi, inferRegulatoryCheck } from "@/lib/regulatory-check";
import { inferVisualMatch } from "@/lib/visual-compare";
import { buildDemoSignalBadges } from "@/lib/demo-signals";
import { hasEnvValue } from "@/lib/env";
import {
  createEvidence,
  createLlmJudgeAssessment,
  createOcrArtifact,
  createRegulatoryCheck,
  createReviewDecision,
  createScore,
  createVisualMatch,
  enrichScoreReasons,
  getEvidence,
  getListings,
  getProduct,
  getScore,
  seedDemoData,
  updateListing,
} from "@/persistence/store";

function chooseDemoListing() {
  const listings = getListings();
  return listings.find((l) => /share in jar|no bpom|murah/i.test(l.title ?? "")) ?? listings[0] ?? null;
}

export async function POST() {
  try {
    seedDemoData();
    const listing = chooseDemoListing();
    if (!listing) return NextResponse.json({ error: "Demo seed did not create a listing" }, { status: 500 });
    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const imageUrl = listing.screenshotUrl ?? listing.imageUrls[0] ?? "https://example.com/somethinc-demo-suspect.png";
    const useMockOcr = !hasEnvValue("MISTRAL_API_KEY") || imageUrl.includes("example.com");

    updateListing(listing.id, { ocrStatus: "pending", ocrRequestedAt: new Date().toISOString() });
    const ocrResult = await processMistralOcr({ listingId: listing.id, imageUrl, forceMock: useMockOcr });
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
          notes: "Extracted during one-click demo pipeline",
        });
      }
    }

    const baseRegulatory = inferRegulatoryCheck(listing, product, ocr);
    const enrichedRegulatory = process.env.BPOM_DISABLE_API
      ? baseRegulatory
      : await enrichRegulatoryCheckWithBpomApi(baseRegulatory, product?.name ?? null);
    const regulatory = createRegulatoryCheck(enrichedRegulatory);
    const visual = createVisualMatch(inferVisualMatch(listing, product));
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

    const score = createScore({ ...enrichScoreReasons(computeScore(listing, product, ocr, regulatory, visual), listing.id), listingId: listing.id });
    if (!getScore(listing.id) || score.recommendedAction !== "ignore") {
      createReviewDecision({ listingId: listing.id, scoreId: score.id, status: "pending" });
    }
    const judge = await runLlmJudge({ listing, product, score, ocr, evidence: getEvidence(listing.id), regulatory, visual }, !hasEnvValue("ANTHROPIC_API_KEY") && !hasEnvValue("MISTRAL_API_KEY"));
    const assessment = createLlmJudgeAssessment({ listingId: listing.id, scoreId: score.id, ...judge });
    const signals = buildDemoSignalBadges({
      ocrProvider: ocr.provider,
      regulatoryProvider: regulatory.provider,
      visualProvider: visual.provider,
      judgeProvider: assessment.provider,
      regulatoryStatus: regulatory.status,
      bpomStatus: regulatory.bpomStatus ?? null,
      bpomLookupDurationMs: regulatory.bpomLookupDurationMs ?? null,
    });

    return NextResponse.json({
      listingId: listing.id,
      listingUrl: `/listings/${listing.id}`,
      usedMockOcr: useMockOcr,
      status: {
        ocrProvider: ocr.provider,
        usedMockOcr: useMockOcr,
        regulatoryProvider: regulatory.provider,
        regulatoryStatus: regulatory.status,
        bpomStatus: regulatory.bpomStatus ?? null,
        bpomLookupDurationMs: regulatory.bpomLookupDurationMs ?? null,
        visualProvider: visual.provider,
        visualStatus: visual.status,
        judgeProvider: assessment.provider,
        usedMockJudge: assessment.provider === "mock",
      },
      signals,
      ocr,
      regulatory,
      visual,
      score,
      judge: assessment,
      reviewUrl: "/review",
      evaluationUrl: "/evaluation",
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

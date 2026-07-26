import { NextResponse } from "next/server";
import { judgeRequestSchema } from "@/domain/schemas";
import { runLlmJudge } from "@/lib/llm-judge";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { createLlmJudgeAssessment, getEvidence, getLatestLlmJudgeAssessment, getLatestOcrArtifact, getLatestRegulatoryCheck, getLatestVisualMatch, getListing, getLlmJudgeAssessments, getProduct, getScore } from "@/persistence/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  ensureDemoSeeded();
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  if (listingId && searchParams.get("latest") === "1") return NextResponse.json(getLatestLlmJudgeAssessment(listingId) ?? null);
  return NextResponse.json(getLlmJudgeAssessments(listingId ?? undefined));
}

export async function POST(request: Request) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  try {
    ensureDemoSeeded();
    const parsed = judgeRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const listing = getListing(parsed.data.listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const score = getScore(listing.id);
    const result = await runLlmJudge({
      listing,
      product: listing.productId ? getProduct(listing.productId) : undefined,
      score,
      ocr: getLatestOcrArtifact(listing.id),
      evidence: getEvidence(listing.id),
      regulatory: getLatestRegulatoryCheck(listing.id),
      visual: getLatestVisualMatch(listing.id),
    }, parsed.data.forceMock);
    const assessment = createLlmJudgeAssessment({ listingId: listing.id, scoreId: score?.id ?? null, ...result });
    return NextResponse.json(assessment, { status: result.error ? 502 : 201 });
  } catch {
    return NextResponse.json({ error: "The evidence judge could not complete. Retry the step; any fallback result will remain clearly labeled." }, { status: 500 });
  }
}

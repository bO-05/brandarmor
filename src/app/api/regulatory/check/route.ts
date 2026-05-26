import { NextResponse } from "next/server";
import { regulatoryCheckRequestSchema } from "@/domain/schemas";
import { computeScore } from "@/domain/scoring";
import { enrichRegulatoryCheckWithBpomApi, inferRegulatoryCheck } from "@/lib/regulatory-check";
import { createEvidence, createRegulatoryCheck, createScore, enrichScoreReasons, getLatestOcrArtifact, getLatestVisualMatch, getListing, getProduct } from "@/persistence/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const { getRegulatoryChecks } = await import("@/persistence/store");
  return NextResponse.json(getRegulatoryChecks(listingId ?? undefined));
}

export async function POST(request: Request) {
  try {
    const parsed = regulatoryCheckRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const listing = getListing(parsed.data.listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    const product = listing.productId ? getProduct(listing.productId) : undefined;
    const artifact = getLatestOcrArtifact(listing.id);
    const base = inferRegulatoryCheck(listing, product, artifact, {
      query: parsed.data.query,
      status: parsed.data.manualStatus ?? undefined,
      matchedProductName: parsed.data.matchedProductName,
      matchedBrandName: parsed.data.matchedBrandName,
      notes: parsed.data.notes,
    });
    // Skip API call only when manual override is provided or env disables it.
    const enriched = parsed.data.manualStatus || process.env.BPOM_DISABLE_API
      ? base
      : await enrichRegulatoryCheckWithBpomApi(base, product?.name ?? null);
    const record = createRegulatoryCheck(enriched);
    createEvidence({
      listingId: listing.id,
      evidenceType: "regulatory_check",
      fieldName: "regulatory_status",
      extractedValue: record.status,
      rawValue: JSON.stringify(record),
      confidence: record.status === "match" || record.status === "mismatch" ? 0.9 : 0.45,
      notes: record.sourceUrl,
    });
    if (record.extractedNie) {
      createEvidence({ listingId: listing.id, evidenceType: "regulatory_identifier", fieldName: "ocr_bpom_nie", extractedValue: record.extractedNie, rawValue: record.extractedNie, confidence: 0.8, notes: "BPOM/NIE extracted from OCR or manual check" });
    }
    const score = product ? createScore({ ...enrichScoreReasons(computeScore(listing, product, artifact, record, getLatestVisualMatch(listing.id)), listing.id), listingId: listing.id }) : null;
    return NextResponse.json({ regulatoryCheck: record, score }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

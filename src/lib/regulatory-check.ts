import type { Listing, OcrArtifact, Product, RegulatoryCheck } from "@/domain/types";
import { verifyBpomNie } from "@/lib/bpom-verify";

export function buildBpomSearchUrl(query: string | null): string {
  const q = encodeURIComponent(query ?? "");
  return `https://cekbpom.pom.go.id/produk-kosmetika?search=${q}`;
}

export function inferRegulatoryCheck(
  listing: Listing,
  product: Product | undefined,
  artifact: OcrArtifact | undefined,
  override?: Partial<Pick<RegulatoryCheck, "status" | "matchedProductName" | "matchedBrandName" | "notes">> & { query?: string | null }
): Omit<RegulatoryCheck, "id" | "createdAt"> {
  const extractedNie = artifact?.parsedFields?.bpomNie ?? artifact?.extractedFields?.bpom_nie ?? null;
  const expectedNie = product?.bpomNie ?? null;
  const query = override?.query ?? extractedNie ?? expectedNie ?? product?.name ?? listing.title ?? null;
  let status: RegulatoryCheck["status"] = "needs_manual_check";
  if (!query) status = "not_available";
  else if (override?.status) status = override.status;
  else if (expectedNie && extractedNie && expectedNie.toUpperCase() === extractedNie.toUpperCase()) status = "match";
  else if (expectedNie && extractedNie && expectedNie.toUpperCase() !== extractedNie.toUpperCase()) status = "mismatch";
  else if (extractedNie && !expectedNie) status = "needs_manual_check";
  else if (expectedNie && !extractedNie) status = "needs_manual_check";

  return {
    listingId: listing.id,
    productId: product?.id ?? null,
    provider: "bpom_linkout",
    query,
    extractedNie,
    expectedNie,
    status,
    matchedProductName: override?.matchedProductName ?? null,
    matchedBrandName: override?.matchedBrandName ?? null,
    sourceUrl: buildBpomSearchUrl(query),
    notes: override?.notes ?? "BPOM/NIE is prepared for official cekbpom.pom.go.id verification; manual confirmation may be required.",
  };
}

/**
 * Enrich an inferred regulatory check by running a real BPOM lookup against
 * cekbpom.pom.go.id. Returns the original inferred check on any error so
 * the demo pipeline never breaks on a network blip.
 */
export async function enrichRegulatoryCheckWithBpomApi(
  base: Omit<RegulatoryCheck, "id" | "createdAt">,
  brandHint?: string | null
): Promise<Omit<RegulatoryCheck, "id" | "createdAt">> {
  if (!base.extractedNie) {
    return base;
  }
  try {
    const verdict = await verifyBpomNie(base.extractedNie, brandHint ?? null);
    let status: RegulatoryCheck["status"] = base.status;
    if (verdict.status === "verified") status = "verified_active";
    else if (verdict.status === "expired") status = "verified_expired";
    else if (verdict.status === "brand_mismatch") status = "brand_mismatch";
    else if (verdict.status === "not_found") status = "not_found";
    else if (verdict.status === "error") status = "needs_manual_check";

    return {
      ...base,
      provider: verdict.status === "error" ? "bpom_linkout" : "bpom_api",
      status,
      matchedProductName: verdict.matchedProductName ?? base.matchedProductName,
      matchedBrandName: verdict.matchedBrandName ?? base.matchedBrandName,
      sourceUrl: verdict.sourceUrl,
      notes: verdict.notes,
      bpomLookupDurationMs: verdict.durationMs,
      bpomStatus: verdict.bpomStatus,
    };
  } catch (e) {
    return {
      ...base,
      notes: `BPOM API lookup failed: ${(e as Error).message}. Falling back to manual link-out.`,
    };
  }
}

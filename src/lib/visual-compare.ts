import type { Listing, Product, VisualMatchEvidence } from "@/domain/types";

function tokenSet(input: string): Set<string> {
  return new Set(input.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / union.size;
}

export function inferVisualMatch(
  listing: Listing,
  product: Product | undefined,
  input?: Partial<Pick<VisualMatchEvidence, "provider" | "suspectImageUrl" | "similarityScore">>
): Omit<VisualMatchEvidence, "id" | "createdAt"> {
  const suspectImageUrl = input?.suspectImageUrl ?? listing.screenshotUrl ?? listing.imageUrls[0] ?? null;
  const referenceImageUrls = product?.officialImageUrls ?? [];
  const fallbackScore = product
    ? jaccard(tokenSet([listing.title, listing.description].filter(Boolean).join(" ")), tokenSet([product.name, product.variant, product.sizeLabel].filter(Boolean).join(" ")))
    : null;
  const similarityScore = input?.similarityScore ?? (suspectImageUrl && referenceImageUrls.length ? Math.max(0.2, fallbackScore ?? 0.5) : null);
  const status: VisualMatchEvidence["status"] =
    similarityScore == null ? "not_available" :
    similarityScore >= 0.72 ? "match" :
    similarityScore < 0.45 ? "mismatch" : "inconclusive";

  return {
    listingId: listing.id,
    productId: product?.id ?? null,
    provider: input?.provider ?? "mock",
    suspectImageUrl,
    referenceImageUrls,
    similarityScore,
    status,
    evidenceSummary: similarityScore == null
      ? "No suspect/reference image pair is available for visual comparison."
      : `Visual adapter/mock similarity is ${Math.round(similarityScore * 100)}%; no production image retrieval is implemented yet.`,
  };
}

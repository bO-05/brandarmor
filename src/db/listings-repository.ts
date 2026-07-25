import { and, desc, eq } from "drizzle-orm";

import type { InsertListing } from "@/domain/schemas";
import type { Listing } from "@/domain/types";

import { getDatabase } from "./index";
import { listings } from "./schema";

function normalizeListingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value.trim().toLowerCase() || null;
  }
}

function mapListing(row: typeof listings.$inferSelect): Listing {
  return {
    id: row.id,
    productId: row.productBaselineId,
    title: row.title,
    description: row.description,
    price: row.price,
    currency: row.currency,
    sellerName: row.sellerName,
    marketplace: row.marketplace,
    listingUrl: row.listingUrl,
    imageUrls: row.imageUrls,
    screenshotUrl: null,
    sourceConfidence: row.sourceConfidence / 10_000,
    rightsStatus: row.rightsStatus,
    limitations: row.limitations,
    observedAt: row.observedAt.toISOString(),
    rawSource: row.rawSource,
    sourceType: row.sourceType,
    ocrStatus: "not_requested",
    ocrRequestedAt: null,
    ocrCompletedAt: null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPilotListing(workspaceId: string, input: InsertListing): Promise<Listing> {
  const db = getDatabase();
  const [created] = await db
    .insert(listings)
    .values({
      workspaceId,
      productBaselineId: input.productId ?? null,
      title: input.title.trim(),
      description: input.description ?? null,
      price: input.price == null ? null : Math.round(input.price),
      currency: input.currency ?? "IDR",
      sellerName: input.sellerName ?? null,
      marketplace: input.marketplace ?? null,
      listingUrl: input.listingUrl ?? null,
      normalizedListingUrl: normalizeListingUrl(input.listingUrl),
      imageUrls: input.imageUrls ?? [],
      sourceConfidence: Math.round((input.sourceConfidence ?? 0.6) * 10_000),
      rightsStatus: input.rightsStatus ?? "unknown",
      limitations: input.limitations ?? [],
      observedAt: new Date(input.observedAt),
      rawSource: input.rawSource ?? null,
      sourceType: input.sourceType,
    })
    .returning();

  return mapListing(created);
}

export async function listPilotListings(workspaceId: string, productId?: string | null): Promise<Listing[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(listings)
    .where(productId
      ? and(eq(listings.workspaceId, workspaceId), eq(listings.productBaselineId, productId))
      : eq(listings.workspaceId, workspaceId))
    .orderBy(desc(listings.createdAt));

  return rows.map(mapListing);
}

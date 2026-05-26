import { NextResponse } from "next/server";
import { getListings, getListing, createListing, createListingsBulk, getProduct, updateListing, enrichScoreReasons } from "@/persistence/store";
import { insertListingSchema, linkListingProductSchema } from "@/domain/schemas";
import { parseJsonImport } from "@/domain/import";
import { computeScore, computeRiskLevel, computeRecommendedAction } from "@/domain/scoring";
import { createScore } from "@/persistence/store";
import { createReviewDecision } from "@/persistence/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const listings = getListings(productId ?? undefined);
    return NextResponse.json(listings);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use /api/listings/import for file uploads" }, { status: 400 });
    }
    const body = await request.json();

    // If it is an array or has {listings: [...]} or {records: [...]}, treat as import
    if (Array.isArray(body) || body.listings || body.records) {
      const importData = Array.isArray(body) ? body : (body.listings ?? body.records);
      const result = parseJsonImport(JSON.stringify(importData));
      if (result.errors.length > 0) {
        return NextResponse.json({ error: "Import validation failed", details: result.errors }, { status: 400 });
      }
      const created = createListingsBulk(result.listings);
      for (const listing of created) {
        const product = listing.productId ? getProduct(listing.productId) : undefined;
        if (product) {
          const score = computeScore(listing, product);
          const enriched = enrichScoreReasons(score, listing.id); const persisted = createScore({ ...enriched, listingId: listing.id });
          if (score.recommendedAction !== "ignore") {
            createReviewDecision({ listingId: listing.id, scoreId: persisted.id, status: "pending" });
          }
        }
      }
      return NextResponse.json({ imported: created.length, listings: created }, { status: 201 });
    }

    // Single listing creation
    const parsed = insertListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const listing = createListing(parsed.data);

    // Auto-score if product is linked
    if (listing.productId) {
      const product = getProduct(listing.productId);
      if (product) {
        const score = computeScore(listing, product);
        const enriched = enrichScoreReasons(score, listing.id);
        const persisted = createScore({ ...enriched, listingId: listing.id });
        if (score.recommendedAction !== "ignore") {
          createReviewDecision({ listingId: listing.id, scoreId: persisted.id, status: "pending" });
        }
      }
    }
    return NextResponse.json(listing, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = linkListingProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const listing = getListing(parsed.data.id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const product = getProduct(parsed.data.productId);
    if (!product) {
      return NextResponse.json({ error: "Product baseline not found" }, { status: 404 });
    }

    const updated = updateListing(listing.id, { productId: product.id });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

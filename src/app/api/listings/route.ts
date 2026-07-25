import { NextResponse, type NextRequest } from "next/server";
import { getListings, getListing, createListing, createListingsBulk, getProduct, updateListing, enrichScoreReasons } from "@/persistence/store";
import { insertListingSchema, linkListingProductSchema } from "@/domain/schemas";
import { parseJsonImport } from "@/domain/import";
import { computeScore, computeRiskLevel, computeRecommendedAction } from "@/domain/scoring";
import { createScore } from "@/persistence/store";
import { createReviewDecision } from "@/persistence/store";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { createPilotListing, listPilotListings } from "@/db/listings-repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const access = await requirePilotWriteActor(request);
    if (!access.allowed) return access.response;
    if (access.actor?.workspaceId) {
      return NextResponse.json(await listPilotListings(access.actor.workspaceId, productId));
    }

    ensureDemoSeeded();
    return NextResponse.json(getListings(productId ?? undefined));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use /api/listings/import for file uploads" }, { status: 400 });
    }
    const body = await request.json();

    // If it is an array or has {listings: [...]} or {records: [...]}, treat as import
    if (Array.isArray(body) || body.listings || body.records) {
      if (access.actor?.workspaceId) {
        return NextResponse.json({
          error: "Bulk pilot imports are not implemented yet.",
          code: "pilot_listing_bulk_import_not_implemented",
        }, { status: 501 });
      }
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
    if (access.actor?.workspaceId) {
      const listing = await createPilotListing(access.actor.workspaceId, parsed.data);
      return NextResponse.json(listing, { status: 201 });
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

export async function PATCH(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (access.actor?.workspaceId) {
    return NextResponse.json({
      error: "Pilot baseline linking is not implemented yet.",
      code: "pilot_listing_link_not_implemented",
    }, { status: 501 });
  }

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

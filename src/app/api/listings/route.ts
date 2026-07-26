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
import { createPilotListing, linkPilotListingProductBaseline, listPilotListings } from "@/db/listings-repository";
import { getPilotProductBaseline } from "@/db/product-baselines-repository";
import { createOrReusePilotInvestigation } from "@/db/investigations-repository";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

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
    if (access.actor?.workspaceId && access.actor.userId) {
      await enforcePilotRateLimit({ workspaceId: access.actor.workspaceId, userId: access.actor.userId, scope: "listing.write", limit: 60, windowSeconds: 60 * 60 });
    }
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
    if (access.actor?.workspaceId && access.actor.userId) {
      const listing = await createPilotListing(access.actor.workspaceId, parsed.data);
      const baseline = listing.productId
        ? await getPilotProductBaseline(access.actor.workspaceId, listing.productId)
        : null;
      const investigation = await createOrReusePilotInvestigation(
        { workspaceId: access.actor.workspaceId, userId: access.actor.userId },
        listing,
        baseline,
      );
      return NextResponse.json({
        listing,
        investigation: investigation.state,
        investigationCreated: investigation.created,
        runUrl: `/api/investigations/${investigation.state.investigation.id}/run`,
        statusUrl: `/api/investigations/${investigation.state.investigation.id}`,
      }, { status: 201 });
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
    if (e instanceof PilotRateLimitError) {
      return NextResponse.json({ error: e.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  try {
    const body = await request.json();
    const parsed = linkListingProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    if (access.actor?.workspaceId && access.actor.userId) {
      await enforcePilotRateLimit({ workspaceId: access.actor.workspaceId, userId: access.actor.userId, scope: "listing.link_baseline", limit: 60, windowSeconds: 60 * 60 });
      const baseline = await getPilotProductBaseline(access.actor.workspaceId, parsed.data.productId);
      if (!baseline) return NextResponse.json({ error: "Product baseline not found" }, { status: 404 });
      const linked = await linkPilotListingProductBaseline(access.actor.workspaceId, parsed.data.id, baseline.id);
      if (!linked) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      const investigation = await createOrReusePilotInvestigation(
        { workspaceId: access.actor.workspaceId, userId: access.actor.userId },
        linked,
        baseline,
      );
      return NextResponse.json({
        listing: linked,
        investigation: investigation.state,
        investigationCreated: investigation.created,
        runUrl: `/api/investigations/${investigation.state.investigation.id}/run`,
      });
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
    if (e instanceof PilotRateLimitError) {
      return NextResponse.json({ error: e.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

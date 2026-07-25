import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPilotProductBaseline } from "@/db/product-baselines-repository";
import { getPilotListing } from "@/db/listings-repository";
import { createOrReusePilotInvestigation } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

const investigationRequestSchema = z.object({ listingId: z.string().uuid() });

export async function POST(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId || !access.actor.userId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  try {
    const parsed = investigationRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const listing = await getPilotListing(access.actor.workspaceId, parsed.data.listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const baseline = listing.productId
      ? await getPilotProductBaseline(access.actor.workspaceId, listing.productId)
      : null;

    const result = await createOrReusePilotInvestigation(
      { workspaceId: access.actor.workspaceId, userId: access.actor.userId },
      listing,
      baseline,
    );
    return NextResponse.json({
      ...result,
      runUrl: `/api/investigations/${result.state.investigation.id}/run`,
      statusUrl: `/api/investigations/${result.state.investigation.id}`,
    }, { status: result.created ? 202 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not queue investigation." }, { status: 500 });
  }
}

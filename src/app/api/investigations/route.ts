import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPilotProductBaseline } from "@/db/product-baselines-repository";
import { getPilotListing } from "@/db/listings-repository";
import { createOrReusePilotInvestigation } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";
import { inngest, isInngestConfigured } from "@/lib/inngest";

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
    await enforcePilotRateLimit({
      workspaceId: access.actor.workspaceId,
      userId: access.actor.userId,
      scope: "investigation.queue",
      limit: 20,
      windowSeconds: 60 * 60,
    });
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
    const inngestConfigured = isInngestConfigured();
    if (result.created && inngestConfigured) {
      await inngest.send({
        name: "brandarmor/investigation.queued",
        data: {
          workspaceId: access.actor.workspaceId,
          userId: access.actor.userId,
          investigationId: result.state.investigation.id,
        },
      });
    }
    return NextResponse.json({
      ...result,
      worker: inngestConfigured ? "inngest_queued" : "manual_resume_required",
      runUrl: `/api/investigations/${result.state.investigation.id}/run`,
      statusUrl: `/api/investigations/${result.state.investigation.id}`,
    }, { status: result.created ? 202 : 200 });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not queue investigation." }, { status: 500 });
  }
}

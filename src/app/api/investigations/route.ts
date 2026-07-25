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
    const parsed = investigationRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    await enforcePilotRateLimit({
      workspaceId: access.actor.workspaceId,
      userId: access.actor.userId,
      scope: "investigation.queue",
      limit: 20,
      windowSeconds: 60 * 60,
    });

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
    let worker: "inngest_queued" | "manual_resume_required" = "manual_resume_required";
    if (inngestConfigured && result.state.investigation.status !== "completed" && result.state.investigation.status !== "completed_partial") {
      try {
        await inngest.send({
          name: "brandarmor/investigation.queued",
          data: {
            workspaceId: access.actor.workspaceId,
            userId: access.actor.userId,
            investigationId: result.state.investigation.id,
          },
        });
        worker = "inngest_queued";
      } catch (enqueueError) {
        console.error("BrandArmor Inngest enqueue failed; durable manual resume remains available", enqueueError);
      }
    }
    return NextResponse.json({
      ...result,
      worker,
      runUrl: `/api/investigations/${result.state.investigation.id}/run`,
      statusUrl: `/api/investigations/${result.state.investigation.id}`,
    }, { status: result.created ? 202 : 200 });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    console.error("BrandArmor investigation queue failed", error);
    return NextResponse.json({ error: "Could not queue investigation.", code: "investigation_queue_failed" }, { status: 500 });
  }
}

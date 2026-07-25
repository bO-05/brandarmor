import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPilotInvestigationState, updatePilotReviewDecision } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

const reviewSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed_counterfeit",
    "likely_counterfeit",
    "rejected_legitimate",
    "gray_market_import",
    "expired_or_unsafe",
    "needs_more_evidence",
    "escalated",
  ]),
  notes: z.string().max(4000).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
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
      scope: "review.update",
      limit: 30,
      windowSeconds: 60 * 60,
    });
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const review = await updatePilotReviewDecision({
      workspaceId: access.actor.workspaceId,
      investigationId: id,
      reviewerUserId: access.actor.userId,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    });
    const state = await getPilotInvestigationState(access.actor.workspaceId, id);
    return NextResponse.json({ review, state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save review decision." }, { status: 500 });
  }
}

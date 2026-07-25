import { NextResponse, type NextRequest } from "next/server";

import { runPilotInvestigation } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId || !access.actor.userId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const state = await runPilotInvestigation({ workspaceId: access.actor.workspaceId, userId: access.actor.userId }, id);
    return NextResponse.json(state, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not run investigation." }, { status: 500 });
  }
}

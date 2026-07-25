import { NextResponse, type NextRequest } from "next/server";

import { getPilotInvestigationState } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(await getPilotInvestigationState(access.actor.workspaceId, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Investigation not found." }, { status: 404 });
  }
}

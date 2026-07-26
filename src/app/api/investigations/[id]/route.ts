import { NextResponse, type NextRequest } from "next/server";

import { getPilotInvestigationState, PilotInvestigationNotFoundError } from "@/db/investigations-repository";
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
    if (error instanceof PilotInvestigationNotFoundError) {
      return NextResponse.json({ error: error.message, code: "investigation_not_found" }, { status: 404 });
    }
    console.error("BrandArmor investigation lookup failed", error);
    return NextResponse.json({ error: "Could not load investigation.", code: "investigation_lookup_failed" }, { status: 500 });
  }
}

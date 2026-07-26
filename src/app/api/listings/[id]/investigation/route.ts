import { NextResponse, type NextRequest } from "next/server";

import { getPilotInvestigationForListing } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const investigation = await getPilotInvestigationForListing(access.actor.workspaceId, id);
    if (!investigation) return NextResponse.json({ error: "No investigation has been queued for this listing." }, { status: 404 });
    return NextResponse.json(investigation, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load investigation." }, { status: 500 });
  }
}

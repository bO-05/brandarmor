import { NextResponse, type NextRequest } from "next/server";

import { getPilotListing } from "@/db/listings-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { getListing } from "@/persistence/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;

  try {
    if (access.actor?.workspaceId) {
      const listing = await getPilotListing(access.actor.workspaceId, id);
      if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
      return NextResponse.json(listing, { headers: { "Cache-Control": "no-store" } });
    }

    const listing = getListing(id);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    return NextResponse.json(listing, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load listing." }, { status: 500 });
  }
}

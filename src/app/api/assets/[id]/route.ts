import { get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { getPilotCaseAsset } from "@/db/case-assets-repository";
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
    const asset = await getPilotCaseAsset(access.actor.workspaceId, id);
    if (!asset || asset.deletedAt) return NextResponse.json({ error: "Case asset not found." }, { status: 404 });

    const result = await get(asset.objectKey, { access: "private" });
    if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Private case asset is unavailable." }, { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retrieve private case asset." }, { status: 500 });
  }
}

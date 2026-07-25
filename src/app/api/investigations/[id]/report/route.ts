import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDatabase } from "@/db";
import { auditEvents, reportVersions } from "@/db/schema";
import { requirePilotAdminActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (isControlledDemoMode()) return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  const access = await requirePilotAdminActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId || !access.actor.userId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getDatabase();
  const now = new Date();
  const deleted = await db
    .update(reportVersions)
    .set({ lifecycleStatus: "deleted", deletedAt: now })
    .where(and(
      eq(reportVersions.workspaceId, access.actor.workspaceId),
      eq(reportVersions.investigationId, id),
      eq(reportVersions.lifecycleStatus, "active"),
    ))
    .returning({ id: reportVersions.id });
  if (!deleted.length) return NextResponse.json({ error: "No active durable report found." }, { status: 404 });

  await db.insert(auditEvents).values({
    workspaceId: access.actor.workspaceId,
    actorUserId: access.actor.userId,
    action: "report.deleted",
    entityType: "report_version",
    entityId: deleted[0].id,
    correlationId: id,
    safeMetadata: { deletedVersions: deleted.length },
  });
  return new NextResponse(null, { status: 204 });
}

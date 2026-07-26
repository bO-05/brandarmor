import { del } from "@vercel/blob";
import { and, eq, isNull, lt } from "drizzle-orm";

import { getDatabase } from "./index";
import { auditEvents, caseAssets, reportVersions } from "./schema";

export async function purgeExpiredRetentionRecords(now = new Date()): Promise<{ assets: number; reports: number }> {
  const db = getDatabase();
  const expiredAssets = await db
    .select()
    .from(caseAssets)
    .where(and(lt(caseAssets.retentionUntil, now), isNull(caseAssets.deletedAt)));

  let assets = 0;
  for (const asset of expiredAssets) {
    try {
      await del(asset.objectKey);
      await db
        .update(caseAssets)
        .set({ deletedAt: now })
        .where(eq(caseAssets.id, asset.id));
      await db.insert(auditEvents).values({
        workspaceId: asset.workspaceId,
        actorUserId: null,
        action: "case_asset.retention_purged",
        entityType: "case_asset",
        entityId: asset.id,
        correlationId: asset.listingId,
        safeMetadata: { retentionUntil: asset.retentionUntil?.toISOString() ?? null },
      });
      assets += 1;
    } catch {
      // Keep the database reference intact when storage deletion fails so the next scheduled run can retry.
    }
  }

  const expiredReports = await db
    .update(reportVersions)
    .set({ lifecycleStatus: "deleted", deletedAt: now })
    .where(and(lt(reportVersions.retentionUntil, now), isNull(reportVersions.deletedAt), eq(reportVersions.lifecycleStatus, "active")))
    .returning({ id: reportVersions.id, workspaceId: reportVersions.workspaceId, investigationId: reportVersions.investigationId, retentionUntil: reportVersions.retentionUntil });
  for (const report of expiredReports) {
    await db.insert(auditEvents).values({
      workspaceId: report.workspaceId,
      actorUserId: null,
      action: "report.retention_purged",
      entityType: "report_version",
      entityId: report.id,
      correlationId: report.investigationId,
      safeMetadata: { retentionUntil: report.retentionUntil?.toISOString() ?? null },
    });
  }

  return { assets, reports: expiredReports.length };
}

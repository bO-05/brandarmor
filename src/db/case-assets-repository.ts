import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "./index";
import { caseAssets } from "./schema";

export type NewCaseAsset = {
  listingId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  provenance: string;
  retentionUntil: Date | null;
};

export async function createPilotCaseAsset(workspaceId: string, asset: NewCaseAsset) {
  const db = getDatabase();
  const [created] = await db
    .insert(caseAssets)
    .values({ workspaceId, ...asset, deletedAt: null })
    .returning();
  return created;
}

export async function getPilotCaseAsset(workspaceId: string, assetId: string) {
  const db = getDatabase();
  const [asset] = await db
    .select()
    .from(caseAssets)
    .where(and(
      eq(caseAssets.workspaceId, workspaceId),
      eq(caseAssets.id, assetId),
    ))
    .limit(1);
  return asset ?? null;
}

export async function listPilotCaseAssets(workspaceId: string, listingId: string) {
  const db = getDatabase();
  return db
    .select()
    .from(caseAssets)
    .where(and(
      eq(caseAssets.workspaceId, workspaceId),
      eq(caseAssets.listingId, listingId),
    ))
    .orderBy(desc(caseAssets.createdAt));
}

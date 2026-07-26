import { and, desc, eq } from "drizzle-orm";

import type { InsertBrand } from "@/domain/schemas";
import type { Brand } from "@/domain/types";

import { getDatabase } from "./index";
import { brands } from "./schema";

function mapBrand(row: typeof brands.$inferSelect): Brand {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    websiteUrl: row.websiteUrl,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPilotBrand(workspaceId: string, input: InsertBrand): Promise<Brand> {
  const db = getDatabase();
  const name = input.name.trim();
  const [existing] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.workspaceId, workspaceId), eq(brands.name, name)))
    .limit(1);
  if (existing) return mapBrand(existing);

  const [created] = await db
    .insert(brands)
    .values({
      workspaceId,
      name,
      description: input.description ?? null,
      websiteUrl: input.websiteUrl ?? null,
      logoUrl: input.logoUrl ?? null,
    })
    .onConflictDoNothing({ target: [brands.workspaceId, brands.name] })
    .returning();
  if (created) return mapBrand(created);

  const [resolved] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.workspaceId, workspaceId), eq(brands.name, name)))
    .limit(1);
  if (!resolved) throw new Error("Brand persistence did not resolve a durable brand.");
  return mapBrand(resolved);
}

export async function listPilotBrands(workspaceId: string): Promise<Brand[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(brands)
    .where(eq(brands.workspaceId, workspaceId))
    .orderBy(desc(brands.createdAt));

  return rows.map(mapBrand);
}

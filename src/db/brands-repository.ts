import { desc, eq } from "drizzle-orm";

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
  const [created] = await db
    .insert(brands)
    .values({
      workspaceId,
      name: input.name.trim(),
      description: input.description ?? null,
      websiteUrl: input.websiteUrl ?? null,
      logoUrl: input.logoUrl ?? null,
    })
    .returning();

  return mapBrand(created);
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

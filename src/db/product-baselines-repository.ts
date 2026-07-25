import { and, desc, eq } from "drizzle-orm";

import type { InsertProduct } from "@/domain/schemas";
import type { Product } from "@/domain/types";

import { getDatabase } from "./index";
import { productBaselines } from "./schema";

function mapProduct(row: typeof productBaselines.$inferSelect): Product {
  return {
    id: row.id,
    brandId: row.brandId,
    name: row.name,
    sku: row.sku,
    msrp: row.msrp,
    msrpCurrency: row.msrpCurrency,
    msrpMin: row.msrpMin,
    msrpMax: row.msrpMax,
    description: row.description,
    officialUrls: row.officialUrls,
    officialImageUrls: row.officialImageUrls,
    requiredKeywords: row.requiredKeywords,
    suspiciousTerms: row.suspiciousTerms,
    counterfeitTerms: row.counterfeitTerms,
    authorizedSellers: row.authorizedSellers,
    packagingNotes: row.packagingNotes,
    labelNotes: row.labelNotes,
    referenceImageNotes: row.referenceImageNotes,
    category: row.category,
    variant: row.variant,
    sizeLabel: row.sizeLabel,
    bpomNie: row.bpomNie,
    ingredientsHighlights: row.ingredientsHighlights,
    packagingClaims: row.packagingClaims,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPilotProductBaseline(workspaceId: string, input: InsertProduct): Promise<Product> {
  const db = getDatabase();
  const [created] = await db
    .insert(productBaselines)
    .values({
      workspaceId,
      brandId: input.brandId,
      name: input.name.trim(),
      sku: input.sku ?? null,
      msrp: input.msrp == null ? null : Math.round(input.msrp),
      msrpCurrency: input.msrpCurrency ?? "IDR",
      msrpMin: input.msrpMin == null ? null : Math.round(input.msrpMin),
      msrpMax: input.msrpMax == null ? null : Math.round(input.msrpMax),
      description: input.description ?? null,
      officialUrls: input.officialUrls ?? [],
      officialImageUrls: input.officialImageUrls ?? [],
      requiredKeywords: input.requiredKeywords ?? [],
      suspiciousTerms: input.suspiciousTerms ?? [],
      counterfeitTerms: input.counterfeitTerms ?? [],
      authorizedSellers: input.authorizedSellers ?? [],
      packagingNotes: input.packagingNotes ?? null,
      labelNotes: input.labelNotes ?? null,
      referenceImageNotes: input.referenceImageNotes ?? null,
      category: input.category ?? "skincare_cosmetics",
      variant: input.variant ?? null,
      sizeLabel: input.sizeLabel ?? null,
      bpomNie: input.bpomNie ?? null,
      ingredientsHighlights: input.ingredientsHighlights ?? [],
      packagingClaims: input.packagingClaims ?? [],
    })
    .returning();

  return mapProduct(created);
}

export async function listPilotProductBaselines(workspaceId: string, brandId?: string | null): Promise<Product[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(productBaselines)
    .where(brandId
      ? and(eq(productBaselines.workspaceId, workspaceId), eq(productBaselines.brandId, brandId))
      : eq(productBaselines.workspaceId, workspaceId))
    .orderBy(desc(productBaselines.createdAt));

  return rows.map(mapProduct);
}

"use client";

import Link from "next/link";
import { PlayCircle, Plus } from "lucide-react";
import type { Brand } from "@/domain/types";
import { formatDate } from "@/lib/utils";

export default function BrandsPage({ initialBrands }: { initialBrands: Brand[] }) {
  const brands = initialBrands;
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground">Manage official product truth for evidence-backed review</p>
        </div>
        <Link href="/brands/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          <Plus className="size-4" /> New Brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center">
          <h2 className="text-lg font-semibold">No product baselines yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            BrandArmor needs official brand and product truth before a listing score is useful. Run the guided demo first, or create a baseline manually.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/demo" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              <PlayCircle className="size-4" /> Run Guided Demo
            </Link>
            <Link href="/brands/new" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm">
              <Plus className="size-4" /> New Brand
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`} className="surface-card rounded-lg p-4 hover-lift block">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{brand.name}</h3>
                  <p className="text-sm text-muted-foreground">{brand.description ?? "No description"}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(brand.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Brand, Product } from "@/domain/types";

export class PilotApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "PilotApiError";
  }
}

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new PilotApiError(body?.error ?? `Request failed with status ${response.status}.`, response.status);
  }
  return response.json() as Promise<T>;
}

export function fetchWorkspaceBrands(): Promise<Brand[]> {
  return readJson<Brand[]>("/api/brands");
}

export function fetchWorkspaceProducts(brandId: string): Promise<Product[]> {
  return readJson<Product[]>(`/api/products?brandId=${encodeURIComponent(brandId)}`);
}

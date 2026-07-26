"use client";

import { useEffect, useState } from "react";
import type { Brand, Product } from "@/domain/types";
import { fetchWorkspaceBrands, fetchWorkspaceProducts } from "@/lib/pilot-api";
import { toast } from "sonner";

export default function BrandDetailPage({
  brandId,
  initialBrand,
  initialProducts,
}: {
  brandId: string;
  initialBrand: Brand | null;
  initialProducts: Product[];
}) {
  const [brand, setBrand] = useState<Brand | null>(initialBrand);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchWorkspaceBrands(), fetchWorkspaceProducts(brandId)])
      .then(([brands, nextProducts]) => {
        if (!active) return;
        setBrand(brands.find((candidate) => candidate.id === brandId) ?? null);
        setProducts(nextProducts);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load this brand baseline.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, [brandId]);

  if (loadError) return <div role="alert" className="p-6 text-destructive">{loadError}</div>;
  if (!loaded) return <div className="p-6">Loading&hellip;</div>;
  if (!brand) return <div className="p-6">This brand was not found in your current workspace.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{brand.name}</h1>
        <p className="text-muted-foreground">{brand.description ?? "No description"}</p>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Products</h2>
        <button type="button" onClick={() => setShowAddProduct(!showAddProduct)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          {showAddProduct ? "Cancel" : "Add Product"}
        </button>
      </div>
      {showAddProduct && <AddProductForm brandId={brandId} onDone={() => { setShowAddProduct(false); fetch(`/api/products?brandId=${brandId}`).then(r => r.json()).then(setProducts); }} />}
      {products.map((p) => (
        <div key={p.id} className="surface-card rounded-lg p-4 mb-2">
          <h3 className="font-semibold">{p.name}</h3>
          <p className="text-sm text-muted-foreground">MSRP: {p.msrp ? `Rp ${p.msrp.toLocaleString("id-ID")}` : "N/A"} | Keywords: {p.requiredKeywords.join(", ") || "none"}</p>
        </div>
      ))}
    </div>
  );
}

function AddProductForm({ brandId, onDone }: { brandId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [msrp, setMsrp] = useState("");
  const [bpomNie, setBpomNie] = useState("");
  const [keywords, setKeywords] = useState("");
  const [officialUrls, setOfficialUrls] = useState("");
  const [officialImageUrls, setOfficialImageUrls] = useState("");
  const [authorizedSellers, setAuthorizedSellers] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const commaSeparated = (value: string) => value.split(",").flatMap((entry) => {
      const trimmed = entry.trim();
      return trimmed ? [trimmed] : [];
    });
    const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      brandId,
      name,
      msrp: msrp ? Number(msrp) : null,
      bpomNie: bpomNie || null,
      requiredKeywords: commaSeparated(keywords),
      officialUrls: commaSeparated(officialUrls),
      officialImageUrls: commaSeparated(officialImageUrls),
      authorizedSellers: commaSeparated(authorizedSellers),
    }) });
    if (res.ok) { toast.success("Product added"); onDone(); } else { toast.error("Failed to add product"); }
  }
  return (
    <form onSubmit={handleSubmit} className="surface-card rounded-lg p-4 mb-4 space-y-3">
      <label className="sr-only" htmlFor="product-name">Product name</label>
      <input id="product-name" type="text" placeholder="Product name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-msrp">MSRP</label>
      <input id="product-msrp" type="number" placeholder="MSRP" value={msrp} onChange={e => setMsrp(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-bpom-nie">BPOM/NIE</label>
      <input id="product-bpom-nie" type="text" placeholder="BPOM/NIE (optional)" value={bpomNie} onChange={e => setBpomNie(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-keywords">Required keywords</label>
      <input id="product-keywords" type="text" placeholder="Official keywords (comma-separated)" value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-official-urls">Official source URLs</label>
      <input id="product-official-urls" type="text" placeholder="Official source URLs (comma-separated)" value={officialUrls} onChange={e => setOfficialUrls(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-official-images">Official image URLs</label>
      <input id="product-official-images" type="text" placeholder="Official image URLs (comma-separated)" value={officialImageUrls} onChange={e => setOfficialImageUrls(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-authorized-sellers">Authorized sellers</label>
      <input id="product-authorized-sellers" type="text" placeholder="Authorized sellers (comma-separated)" value={authorizedSellers} onChange={e => setAuthorizedSellers(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <p className="text-xs text-muted-foreground">Add official references now; they become the durable baseline for evidence collection and scoring.</p>
      <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Save Product Baseline</button>
    </form>
  );
}

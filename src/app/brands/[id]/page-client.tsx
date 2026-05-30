"use client";

import { useState } from "react";
import type { Brand, Product } from "@/domain/types";
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
  const brand = initialBrand;
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showAddProduct, setShowAddProduct] = useState(false);

  if (!brand) return <div className="p-6">Loading&hellip;</div>;

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
  const [keywords, setKeywords] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requiredKeywords = keywords.split(",").flatMap((keyword) => {
      const trimmed = keyword.trim();
      return trimmed ? [trimmed] : [];
    });
    const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId, name, msrp: msrp ? Number(msrp) : null, requiredKeywords }) });
    if (res.ok) { toast.success("Product added"); onDone(); } else { toast.error("Failed to add product"); }
  }
  return (
    <form onSubmit={handleSubmit} className="surface-card rounded-lg p-4 mb-4 space-y-3">
      <label className="sr-only" htmlFor="product-name">Product name</label>
      <input id="product-name" type="text" placeholder="Product name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-msrp">MSRP</label>
      <input id="product-msrp" type="number" placeholder="MSRP" value={msrp} onChange={e => setMsrp(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <label className="sr-only" htmlFor="product-keywords">Required keywords</label>
      <input id="product-keywords" type="text" placeholder="Required keywords (comma-separated)" value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
      <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Save Product</button>
    </form>
  );
}

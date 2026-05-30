"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", price: "", marketplace: "", sellerName: "", listingUrl: "", productId: "", screenshotUrl: "" });
  const [products, setProducts] = useState<Array<{ id: string; name: string; category?: string; bpomNie?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  function set(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })); }

  function parseIdrPrice(value: string): number | null {
    const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function validatePrice(value: string): string | null {
    if (!value.trim()) return null;
    return parseIdrPrice(value) ? null : "Enter a positive IDR amount, for example 150000 or 150.000.";
  }

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => setProducts(Array.isArray(json) ? json : []))
      .catch(() => setProducts([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextPriceError = validatePrice(form.price);
    setPriceError(nextPriceError);
    if (nextPriceError) return;
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || null,
          description: form.description || null,
          price: form.price ? parseIdrPrice(form.price) : null,
          marketplace: form.marketplace || null,
          sellerName: form.sellerName || null,
          listingUrl: form.listingUrl || null,
          productId: form.productId || null,
          screenshotUrl: form.screenshotUrl || null,
          imageUrls: form.screenshotUrl ? [form.screenshotUrl] : [],
          sourceType: "manual",
          observedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed"); }
      toast.success("Listing created");
      router.push("/listings");
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }

  function renderField({
    l,
    k,
    t,
    n,
    u,
    placeholder,
  }: {
    l: string;
    k: keyof typeof form;
    t?: boolean;
    n?: boolean;
    u?: boolean;
    placeholder?: string;
  }) {
    return (
      <div key={k}>
        <label className="block text-sm font-medium mb-1">{l}</label>
        {t ? <textarea value={form[k]} onChange={e => set(k,e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-border rounded-md bg-background" rows={3} />
          : <input
              type={n?"text":u?"url":"text"}
              inputMode={n?"decimal":undefined}
              value={form[k]}
              onChange={e => {
                set(k,e.target.value);
                if (k === "price") setPriceError(validatePrice(e.target.value));
              }}
              onBlur={() => k === "price" && setPriceError(validatePrice(form.price))}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />}
        {k === "price" && priceError && <p className="mt-1 text-xs text-destructive">{priceError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Listing</h1>
      <form onSubmit={handleSubmit} className="surface-card rounded-lg p-6 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Product Baseline</label>
          <select value={form.productId} onChange={(e) => set("productId", e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background">
            <option value="">No baseline selected</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.bpomNie ? ` / ${p.bpomNie}` : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional for intake, but required before OCR, BPOM/NIE, visual comparison, scoring, and judge assessment can run.
          </p>
          {products.length === 0 && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-semibold">No product baselines yet.</p>
              <p className="mt-1 text-muted-foreground">Run the guided demo or create brand/product truth before scoring this listing.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/demo" className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Run guided demo</Link>
                <Link href="/brands" className="rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">Create baseline</Link>
              </div>
            </div>
          )}
        </div>
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Listing content</h2>
          {renderField({ l: "Title", k: "title" })}
          {renderField({ l: "Description", k: "description", t: true })}
        </section>
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Marketplace metadata</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {renderField({ l: "Price (IDR)", k: "price", n: true, placeholder: "150.000" })}
            {renderField({ l: "Marketplace", k: "marketplace", placeholder: "shopee" })}
            {renderField({ l: "Seller Name", k: "sellerName", placeholder: "Seller name" })}
          </div>
        </section>
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Source links</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {renderField({ l: "Listing URL", k: "listingUrl", u: true, placeholder: "https://..." })}
            {renderField({ l: "Screenshot / Image URL", k: "screenshotUrl", u: true, placeholder: "https://.../image.png" })}
          </div>
        </section>
        <button type="submit" disabled={loading || Boolean(priceError)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50">
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}

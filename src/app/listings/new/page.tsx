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
  const [titleError, setTitleError] = useState<string | null>(null);

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

  function validateTitle(value: string): string | null {
    return value.trim() ? null : "Listing title is required.";
  }

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => setProducts(Array.isArray(json) ? json : []))
      .catch(() => setProducts([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextTitleError = validateTitle(form.title);
    const nextPriceError = validatePrice(form.price);
    setTitleError(nextTitleError);
    setPriceError(nextPriceError);
    if (nextTitleError || nextPriceError) return;
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
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
    const id = `listing-${k}`;
    const errorId = `${id}-error`;
    const isPrice = k === "price";
    const isTitle = k === "title";
    const fieldError = isPrice ? priceError : isTitle ? titleError : null;

    return (
      <div key={k}>
        <label htmlFor={id} className="mb-1 block text-sm font-medium">{l}</label>
        {t ? <textarea id={id} name={k} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-border bg-background px-3 py-2" rows={3} />
          : <input
              id={id}
              name={k}
              type={n ? "text" : u ? "url" : "text"}
              inputMode={n ? "decimal" : undefined}
              value={form[k]}
              onChange={e => {
                set(k, e.target.value);
                if (isPrice) setPriceError(validatePrice(e.target.value));
                if (isTitle) setTitleError(validateTitle(e.target.value));
              }}
              onBlur={() => {
                if (isPrice) setPriceError(validatePrice(form.price));
                if (isTitle) setTitleError(validateTitle(form.title));
              }}
              placeholder={placeholder}
              required={isTitle}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? errorId : undefined}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />}
        {fieldError && <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">{fieldError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Listing</h1>
      <form noValidate onSubmit={handleSubmit} className="surface-card rounded-lg p-6 space-y-3">
        <div>
          <label htmlFor="listing-product-baseline" className="mb-1 block text-sm font-medium">Product Baseline</label>
          <select id="listing-product-baseline" name="productId" value={form.productId} onChange={(e) => set("productId", e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
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

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
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");

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

  function extractPastedListing() {
    const lines = pastedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const priceMatch = pastedText.match(/(?:rp\.?|idr)\s*([\d.,]+)/i);
    const sellerMatch = pastedText.match(/(?:seller|penjual|shop)\s*[:\-]\s*([^\n]+)/i);
    const marketplace = /shopee/i.test(pastedText) ? "shopee" : /tokopedia/i.test(pastedText) ? "tokopedia" : /lazada/i.test(pastedText) ? "lazada" : /blibli/i.test(pastedText) ? "blibli" : /bukalapak/i.test(pastedText) ? "bukalapak" : "";
    setForm((current) => ({
      ...current,
      title: current.title || lines[0] || "",
      description: current.description || pastedText,
      price: current.price || (priceMatch?.[1] ?? ""),
      sellerName: current.sellerName || (sellerMatch?.[1]?.trim() ?? ""),
      marketplace: current.marketplace || marketplace,
    }));
    setTitleError(null);
    setPriceError(null);
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
    const nextBaselineError = form.productId ? null : "Choose a product baseline before creating a durable investigation.";
    setTitleError(nextTitleError);
    setPriceError(nextPriceError);
    setBaselineError(nextBaselineError);
    if (nextTitleError || nextPriceError || nextBaselineError) return;
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const listingId = data.listing?.id ?? data.id;
      if (!listingId) throw new Error("Listing was created without an identifier.");
      if (screenshotFile) {
        const upload = new FormData();
        upload.set("file", screenshotFile);
        const uploadResponse = await fetch(`/api/listings/${listingId}/assets`, { method: "POST", body: upload });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadJson.error ?? "Listing was created, but the private screenshot upload failed.");
      }
      toast.success(screenshotFile ? "Listing and private screenshot saved. Investigation is queued." : "Listing created. Investigation is queued.");
      router.push(`/listings/${listingId}`);
      router.refresh();
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
        <section className="rounded-md border border-border bg-muted/40 p-4">
          <h2 className="text-sm font-semibold">Start with a marketplace URL, pasted listing text, or screenshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">Paste what you can see from the listing. BrandArmor extracts a draft that you can review and correct before saving.</p>
          <textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste listing title, price, seller, and description" rows={4} className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={extractPastedListing} disabled={!pastedText.trim()} className="mt-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-60">Extract draft fields</button>
        </section>
        <div>
          <label htmlFor="listing-product-baseline" className="mb-1 block text-sm font-medium">Product Baseline</label>
          <select id="listing-product-baseline" name="productId" required value={form.productId} onChange={(e) => { set("productId", e.target.value); setBaselineError(e.target.value ? null : "Choose a product baseline before creating a durable investigation."); }} className="w-full rounded-md border border-border bg-background px-3 py-2">
            <option value="">No baseline selected</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.bpomNie ? ` / ${p.bpomNie}` : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            A product baseline is required for the durable investigation, scoring, and review workflow.
          </p>
          {baselineError ? <p role="alert" className="mt-1 text-xs text-destructive">{baselineError}</p> : null}
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
            {renderField({ l: "Existing public image URL (optional)", k: "screenshotUrl", u: true, placeholder: "https://.../image.png" })}
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <label htmlFor="listing-private-screenshot" className="block text-sm font-medium">Private screenshot upload</label>
            <input id="listing-private-screenshot" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setScreenshotFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP up to 10 MB. BrandArmor stores this in private case storage; it is not published through a public image URL.</p>
          </div>
        </section>
        <button type="submit" disabled={loading || Boolean(priceError)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50">
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}

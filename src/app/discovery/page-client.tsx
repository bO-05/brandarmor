"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2 } from "lucide-react";
import { GLOGLOWING_DISCOVERY_QUERY } from "@/lib/discovery-defaults";

interface Candidate {
  title: string;
  url: string;
  snippet: string;
  marketplace: string;
  source: string;
  sourceConfidence: number;
  verifiedMarketplaceDomain: true;
}

export default function DiscoveryPage() {
  const router = useRouter();
  const [query, setQuery] = useState(GLOGLOWING_DISCOVERY_QUERY);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setProducts(Array.isArray(rows) ? rows : []))
      .catch(() => setProducts([]));
  }, []);

  async function discover() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Discovery failed");
      setCandidates(json.candidates ?? []);
      setMessage(json.notice ?? null);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function addCandidate(c: Candidate) {
    if (!productId) {
      setMessage("Select a product baseline before saving this candidate.");
      return;
    }
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: c.title,
        description: c.snippet,
        marketplace: c.marketplace,
        listingUrl: c.url,
        productId,
        sourceType: "search_api",
        sourceConfidence: c.sourceConfidence,
        rightsStatus: "public_search_result",
        limitations: ["Verified marketplace domain only. Search result still requires user confirmation and private evidence capture."],
        observedAt: new Date().toISOString(),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Failed to save");
      return;
    }
    const listingId = json.listing?.id ?? json.id;
    if (!listingId) {
      setMessage("Candidate was saved without a listing identifier.");
      return;
    }
    router.push(`/listings/${listingId}`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Candidate Discovery</h1>
        <p className="text-muted-foreground">Find leads, then turn them into evidence-backed listings. Search results are not final proof.</p>
      </div>

      <div className="surface-card rounded-lg p-5 mb-5">
        <label htmlFor="discovery-query" className="block text-sm font-medium mb-2">Search query</label>
        <div className="flex gap-2">
          <input id="discovery-query" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={discover} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Discover
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>

      {pendingCandidate ? <section className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-semibold">Confirm candidate before saving</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review the marketplace URL and choose the official product baseline. This creates an investigation-ready listing; it does not label the listing as counterfeit.</p>
        <p className="mt-3 text-sm"><b>{pendingCandidate.title}</b><br /><span className="break-all text-muted-foreground">{pendingCandidate.url}</span></p>
        {products.length ? <label className="mt-4 block text-sm font-medium">Product baseline<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"><option value="">Choose a baseline</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : <p className="mt-4 text-sm text-warning">Create a baseline first. <Link href="/brands" className="font-semibold text-primary">Open Brands</Link></p>}
        <div className="mt-4 flex gap-2"><button type="button" onClick={() => void addCandidate(pendingCandidate)} disabled={!productId} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Confirm and save listing</button><button type="button" onClick={() => setPendingCandidate(null)} className="rounded-md bg-secondary px-4 py-2 text-sm">Cancel</button></div>
      </section> : null}

      <div className="grid gap-3">
        {candidates.map((c, i) => (
          <div key={`${c.url}-${i}`} className="surface-card rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{c.snippet}</p>
                <p className="text-xs text-muted-foreground mt-2">{c.marketplace} · {c.source} · confidence {Math.round(c.sourceConfidence * 100)}%</p>
                <a className="text-xs text-primary break-all" href={c.url} target="_blank">{c.url}</a>
              </div>
              <button type="button" onClick={() => { setPendingCandidate(c); setProductId(""); }} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                <Plus className="size-4" /> Review & save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

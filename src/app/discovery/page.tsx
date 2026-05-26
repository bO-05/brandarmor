"use client";

import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { GLOGLOWING_DISCOVERY_QUERY } from "@/lib/discovery-defaults";

interface Candidate {
  title: string;
  url: string;
  snippet: string;
  marketplace: string;
  source: string;
  sourceConfidence: number;
}

export default function DiscoveryPage() {
  const [query, setQuery] = useState(GLOGLOWING_DISCOVERY_QUERY);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function addCandidate(c: Candidate) {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: c.title,
        description: c.snippet,
        marketplace: c.marketplace,
        listingUrl: c.url,
        sourceType: "search_api",
        sourceConfidence: c.sourceConfidence,
        rightsStatus: "public_search_result",
        limitations: ["Search result only; confirm with browser capture or uploaded screenshot"],
        observedAt: new Date().toISOString(),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Candidate saved as listing ${json.id}` : json.error ?? "Failed to save");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Candidate Discovery</h1>
        <p className="text-muted-foreground">Find leads, then turn them into evidence-backed listings. Search results are not final proof.</p>
      </div>

      <div className="surface-card rounded-lg p-5 mb-5">
        <label className="block text-sm font-medium mb-2">Search query</label>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={discover} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Discover
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </div>

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
              <button onClick={() => addCandidate(c)} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                <Plus className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

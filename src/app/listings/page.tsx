"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, Plus, Search, Upload } from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import type { Listing } from "@/domain/types";
import { fetchJsonArray } from "@/lib/api-client";
import { formatCurrency, getScoreColor } from "@/lib/utils";

interface ScoreSummary {
  listingId: string;
  totalScore: number;
  riskLevel: string;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<(Listing & { score?: number; riskLevel?: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [listingsResult, scoresResult] = await Promise.all([
        fetchJsonArray<Listing>("/api/listings"),
        fetchJsonArray<ScoreSummary>("/api/scoring"),
      ]);
      const scoresMap = new Map(scoresResult.data.map((s) => [s.listingId, s]));
      const enriched = listingsResult.data.map((l) => ({
        ...l,
        score: scoresMap.get(l.id)?.totalScore,
        riskLevel: scoresMap.get(l.id)?.riskLevel,
      }));
      setListings(enriched);
      setError([listingsResult.error, scoresResult.error].filter(Boolean).join(" ") || null);
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <DemoWorkflowTrail />
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Listings</h1><p className="text-muted-foreground">Candidate marketplace listings</p></div>
        <div className="flex gap-2">
          <Link href="/listings/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"><Plus className="w-4 h-4" /> Add Listing</Link>
          <Link href="/discovery" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"><Search className="w-4 h-4" /> Discover</Link>
          <Link href="/listings/import" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"><Upload className="w-4 h-4" /> Import</Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Backend unavailable. Showing available listing data only. Check local JSON persistence or rerun the guided demo if expected seed data is missing. {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center">
          <h2 className="text-lg font-semibold">No candidate listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Start with the guided demo to see a complete evidence review, or add a listing once a product baseline exists.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/demo" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              <PlayCircle className="w-4 h-4" /> Run Guided Demo
            </Link>
            <Link href="/listings/new" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm">
              <Plus className="w-4 h-4" /> Add Listing
            </Link>
            <Link href="/listings/import" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm">
              <Upload className="w-4 h-4" /> Import
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {listings.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} className="surface-card rounded-lg p-4 block hover-lift">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.title ?? "Untitled"}</p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{l.marketplace ?? "N/A"}</span>
                    <span>{l.sellerName ?? "Unknown seller"}</span>
                    <span>{formatCurrency(l.price, l.currency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-xs bg-muted">{l.ocrStatus}</span>
                  {l.score !== undefined && (
                    <span className={`ml-3 px-2.5 py-1 rounded text-xs font-semibold ${getScoreColor(l.score)}`}>
                      Score: {l.score}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

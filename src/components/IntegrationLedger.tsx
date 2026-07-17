"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Route } from "lucide-react";

type IntegrationEntry = {
  configured?: boolean;
  implemented: boolean;
  mode: "real_optional" | "roadmap" | string;
  provider: string;
  model?: string;
  notes: string;
};

type IntegrationResponse = { integrations?: Record<string, IntegrationEntry> };

function statusFor(entry: IntegrationEntry): { label: "real" | "fallback" | "roadmap"; detail: string; className: string } {
  if (!entry.implemented || entry.mode === "roadmap") {
    return { label: "roadmap", detail: entry.notes, className: "border-slate-200 bg-slate-50 text-slate-700" };
  }
  if (entry.configured) {
    return { label: "real", detail: entry.notes, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  return { label: "fallback", detail: entry.notes, className: "border-amber-200 bg-amber-50 text-amber-800" };
}

export function IntegrationLedger() {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationEntry> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/integrations")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: IntegrationResponse | null) => {
        if (!cancelled) setIntegrations(payload?.integrations ?? null);
      })
      .catch(() => {
        if (!cancelled) setIntegrations(null);
      });
    return () => { cancelled = true; };
  }, []);

  if (!integrations) return null;

  return (
    <section className="surface-card mt-6 rounded-lg p-5" aria-labelledby="integration-ledger-title">
      <div className="flex items-start gap-3">
        <Route className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Evidence provenance</p>
          <h2 id="integration-ledger-title" className="mt-1 font-semibold">Real, fallback, and roadmap ledger</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">A configured key is not a claim of certainty. This ledger shows which current paths are implemented, which can fall back, and which remain deliberately out of scope.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">real available</span>
        <span className="status-pill border-amber-200 bg-amber-50 text-amber-800">fallback available</span>
        <span className="status-pill border-slate-200 bg-slate-50 text-slate-700">roadmap only</span>
      </div>
      <details className="mt-4 rounded-md border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-semibold">View integration ledger and cost note</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(integrations).map(([key, entry]) => {
            const status = statusFor(entry);
            return (
              <div key={key} className={`rounded-md border p-3 ${status.className}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.provider}</p>
                  <span className="status-pill bg-white/70 text-current">{status.label}</span>
                </div>
                {entry.model && <p className="mt-1 text-xs opacity-85">{entry.model}</p>}
                <p className="mt-2 text-xs leading-5 opacity-85">{status.detail}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">{status.label === "real" ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}{entry.implemented ? "implemented path" : "not called by this app"}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">Cost visibility: provider provenance is shown above, but no currency estimate is displayed until a verified rate card and durable usage ledger are available. This prevents a demo estimate from being presented as an operational unit cost.</p>
      </details>
    </section>
  );
}

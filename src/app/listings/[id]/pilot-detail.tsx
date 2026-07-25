"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, FileText, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";

import type { Listing } from "@/domain/types";
import { formatCurrency, getScoreColor } from "@/lib/utils";

type InvestigationState = {
  investigation: {
    id: string;
    listingId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  stages: Array<{
    stage: string;
    status: string;
    attempt: number;
    safeError: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  assets: Array<{
    id: string;
    contentType: string;
    sizeBytes: number;
    provenance: string;
    retentionUntil: string | null;
    createdAt: string;
    viewUrl: string;
  }>;
  evidence: Array<{
    id: string;
    evidenceType: string;
    fieldName: string;
    extractedValue: string | null;
    confidence: number | null;
    collectionStatus: string;
    provenance: string;
    notes: string | null;
    createdAt: string;
  }>;
  score: {
    riskScore: number;
    evidenceCompleteness: number;
    confidence: "low" | "medium" | "high";
    riskLevel: string;
    recommendedAction: string;
    reasons: Array<{ ruleId: string; ruleName: string; message: string; points: number }>;
    scoringVersion: string;
  } | null;
  review: { id: string; status: string; revision: number; updatedAt: string } | null;
  report: { id: string; version: number; lifecycleStatus: string; createdAt: string } | null;
};

function stageTone(status: string): string {
  if (status === "succeeded") return "border-success/30 bg-success/10 text-success";
  if (status === "partial") return "border-warning/40 bg-warning/10 text-warning";
  if (status === "failed") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "running") return "border-primary/30 bg-primary/10 text-primary";
  return "border-border bg-muted text-muted-foreground";
}

export default function PilotListingDetail({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationState | null>(null);
  const [assets, setAssets] = useState<InvestigationState["assets"]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listingResponse = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
      const listingJson = await listingResponse.json();
      if (!listingResponse.ok) throw new Error(listingJson.error ?? "Listing not found.");
      setListing(listingJson);
      const assetsResponse = await fetch(`/api/listings/${listingId}/assets`, { cache: "no-store" });
      const assetsJson = await assetsResponse.json();
      if (!assetsResponse.ok) throw new Error(assetsJson.error ?? "Could not load private case assets.");
      setAssets(Array.isArray(assetsJson) ? assetsJson : []);

      const investigationResponse = await fetch(`/api/listings/${listingId}/investigation`, { cache: "no-store" });
      if (investigationResponse.status === 404) {
        setInvestigation(null);
      } else {
        const investigationJson = await investigationResponse.json();
        if (!investigationResponse.ok) throw new Error(investigationJson.error ?? "Could not load investigation.");
        setInvestigation(investigationJson);
        setReviewStatus(investigationJson.review?.status ?? "pending");
      }
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the durable case workspace.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { void load(); }, [load]);

  async function queueOrRun() {
    setRunning(true);
    try {
      let current = investigation;
      if (!current) {
        const queuedResponse = await fetch("/api/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        const queuedJson = await queuedResponse.json();
        if (!queuedResponse.ok) throw new Error(queuedJson.error ?? "Could not queue the investigation.");
        current = queuedJson.state;
        setInvestigation(current);
        if (queuedJson.worker === "inngest_queued") {
          setMessage("Durable workflow queued with the background worker. Refresh this workspace to see persisted stage updates.");
          return;
        }
      }

      const investigationId = current?.investigation.id;
      if (!investigationId) throw new Error("Investigation queue did not return an identifier.");
      const runResponse = await fetch(`/api/investigations/${investigationId}/run`, { method: "POST" });
      const runJson = await runResponse.json();
      if (!runResponse.ok) throw new Error(runJson.error ?? "Could not run the investigation.");
      setInvestigation(runJson);
      setReviewStatus(runJson.review?.status ?? "pending");
      setMessage("Durable investigation completed with explicit partial-provider status.");
    } catch (error) {
      console.error("BrandArmor durable workflow request failed", error);
      const detail = error instanceof Error && error.message !== "Failed to fetch" ? error.message : "Could not reach the durable workflow. Refresh and retry; existing case state is preserved.";
      setMessage(detail);
    } finally {
      setRunning(false);
    }
  }

  async function uploadPrivateScreenshot() {
    if (!screenshotFile) {
      setMessage("Choose a JPEG, PNG, or WebP screenshot first.");
      return;
    }
    setRunning(true);
    try {
      const form = new FormData();
      form.set("file", screenshotFile);
      const response = await fetch(`/api/listings/${listingId}/assets`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not upload private screenshot.");
      setScreenshotFile(null);
      await load();
      setMessage("Private screenshot saved. Resume the workflow to collect provider evidence.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload private screenshot.");
    } finally {
      setRunning(false);
    }
  }

  async function deleteReport() {
    if (!investigation || !window.confirm("Delete the active durable report versions for this case? This preserves an audit event but makes the reports unavailable.")) return;
    setRunning(true);
    try {
      const response = await fetch(`/api/investigations/${investigation.investigation.id}/report`, { method: "DELETE" });
      if (response.status !== 204) {
        const body = await response.json();
        throw new Error(body.error ?? "Could not delete report.");
      }
      await load();
      setMessage("Active durable report versions were deleted. The audit event is retained.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete report.");
    } finally {
      setRunning(false);
    }
  }

  async function saveReview() {
    if (!investigation) return;
    setRunning(true);
    try {
      const response = await fetch(`/api/investigations/${investigation.investigation.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, notes: reviewNotes || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save review decision.");
      setInvestigation(body.state);
      setReviewStatus(body.state.review?.status ?? reviewStatus);
      setMessage("Human review decision saved to the durable investigation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review decision.");
    } finally {
      setRunning(false);
    }
  }

  if (loading && !listing) return <div className="p-6">Loading durable case workspace…</div>;
  if (!listing) return <div className="p-6"><Link href="/listings" className="text-primary">Back to listings</Link><p className="mt-4">{message ?? "Listing not found."}</p></div>;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/listings" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Listings</Link>
      <header className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durable investigation workspace</p>
            <h1 className="mt-1 text-2xl font-bold">{listing.title ?? "Untitled listing"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{listing.marketplace ?? "Unknown marketplace"} · {listing.sellerName ?? "Unknown seller"} · {formatCurrency(listing.price, listing.currency)}</p>
          </div>
          <button type="button" onClick={() => void queueOrRun()} disabled={running} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {running ? <RefreshCw className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            {investigation ? "Resume durable workflow" : "Start durable workflow"}
          </button>
        </div>
        {message ? <p role="status" className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm">{message}</p> : null}
      </header>

      <section className="mt-5 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Private screenshots</h2>
        <p className="mt-1 text-sm text-muted-foreground">Screenshots are stored in private case storage and are delivered only through authenticated routes.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setScreenshotFile(event.target.files?.[0] ?? null)} className="text-sm" /><button type="button" onClick={() => void uploadPrivateScreenshot()} disabled={running || !screenshotFile} className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-60">Upload private screenshot</button></div>
        {assets.length ? <ul className="mt-4 space-y-2 text-sm">{assets.map((asset) => <li key={asset.id} className="rounded-md border border-border bg-background p-3"><a href={asset.viewUrl} className="font-semibold text-primary">Private screenshot</a><span className="ml-2 text-muted-foreground">{Math.round(asset.sizeBytes / 1024)} KB · retained until {asset.retentionUntil ? new Date(asset.retentionUntil).toLocaleDateString() : "manual deletion"}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">No private screenshot attached yet.</p>}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" /> Evidence stages</h2>
        {!investigation ? <p className="mt-3 text-sm text-muted-foreground">No investigation has been queued yet. Start the workflow to persist intake, provider status, score, review, and report state.</p> : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {investigation.stages.map((stage) => (
              <div key={stage.stage} className={`rounded-md border p-3 ${stageTone(stage.status)}`}>
                <div className="flex items-center justify-between gap-3"><b className="capitalize">{stage.stage.replaceAll("_", " ")}</b><span className="text-xs font-semibold uppercase">{stage.status}</span></div>
                <p className="mt-1 text-xs">{stage.safeError ?? "No limitation recorded."}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {investigation?.evidence.length ? <section className="mt-5 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Persisted evidence</h2>
        <div className="mt-4 grid gap-3">
          {investigation.evidence.map((item) => <div key={item.id} className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>{item.fieldName.replaceAll("_", " ")}</b><span className="text-xs uppercase text-muted-foreground">{item.collectionStatus}</span></div>
            <p className="mt-1 text-muted-foreground">{item.extractedValue ?? "No extracted value"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Provenance: {item.provenance}{item.confidence == null ? "" : ` · ${Math.round(item.confidence * 100)}% confidence`}</p>
          </div>)}
        </div>
      </section> : null}

      {investigation?.score ? (
        <section className="mt-5 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold">Risk, completeness, and confidence</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`rounded-md p-4 ${getScoreColor(investigation.score.riskScore)}`}><p className="text-xs font-semibold uppercase">Risk score</p><p className="mt-1 text-2xl font-bold">{investigation.score.riskScore}</p><p className="text-sm">{investigation.score.riskLevel}</p></div>
            <div className="rounded-md bg-muted p-4"><p className="text-xs font-semibold uppercase">Evidence completeness</p><p className="mt-1 text-2xl font-bold">{Math.round(investigation.score.evidenceCompleteness * 100)}%</p><p className="text-sm">Missing providers lower certainty, not risk.</p></div>
            <div className="rounded-md bg-muted p-4"><p className="text-xs font-semibold uppercase">Confidence</p><p className="mt-1 text-2xl font-bold capitalize">{investigation.score.confidence}</p><p className="text-sm">{investigation.score.recommendedAction.replaceAll("_", " ")}</p></div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">{investigation.score.reasons.map((reason) => <li key={reason.ruleId} className="rounded-md bg-muted p-3"><b>{reason.ruleName}</b><br />{reason.message}</li>)}</ul>
        </section>
      ) : null}

      {investigation ? <section className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /><h2 className="font-semibold">Human review</h2></div><p className="mt-2 text-sm text-muted-foreground">{investigation.review ? `${investigation.review.status.replaceAll("_", " ")} · revision ${investigation.review.revision}` : "Run the workflow before saving a review decision."}</p>{investigation.review ? <div className="mt-3 space-y-2"><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="pending">Pending</option><option value="needs_more_evidence">Needs more evidence</option><option value="likely_counterfeit">Likely counterfeit</option><option value="confirmed_counterfeit">Confirmed counterfeit</option><option value="rejected_legitimate">Rejected legitimate</option><option value="gray_market_import">Gray market import</option><option value="expired_or_unsafe">Expired or unsafe</option><option value="escalated">Escalated</option></select><textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Internal review notes (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={2} /><button type="button" onClick={() => void saveReview()} disabled={running} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Save human review</button></div> : null}</div>
        <div className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><h2 className="font-semibold">Versioned report</h2></div><p className="mt-2 text-sm text-muted-foreground">{investigation.report ? `Version ${investigation.report.version} · ${investigation.report.lifecycleStatus}` : "Report is created after the durable workflow runs."}</p>{investigation.report ? <div className="mt-3 flex flex-wrap gap-3"><a href={`/api/listings/${listing.id}/report?format=json`} className="text-sm font-semibold text-primary">Download durable JSON report</a><button type="button" onClick={() => void deleteReport()} disabled={running} className="text-sm font-semibold text-destructive disabled:opacity-60">Delete active report</button></div> : null}</div>
      </section> : null}
    </div>
  );
}

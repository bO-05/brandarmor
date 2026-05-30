"use client";

import { useEffect, useReducer } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, HelpCircle, PlayCircle, Plus, Upload, XCircle } from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { ReviewDecisionPanel } from "@/components/ReviewDecisionPanel";
import { ReviewNextSteps } from "@/components/ReviewNextSteps";
import { fetchJsonArray } from "@/lib/api-client";
import type { RecommendedAction, ReviewStatus, Score } from "@/domain/types";
import { getReviewQueueEmptyState, getReviewStatusPresentation, summarizeReviewQueue } from "@/lib/ui-ux";

interface ReviewItem {
  id: string; listingId: string; scoreId: string; status: ReviewStatus;
  reviewer: string | null; notes: string | null; createdAt: string;
  listing?: { title?: string | null; price?: number | null; sellerName?: string | null; marketplace?: string | null };
  score?: ScoreSummary | null;
}

interface ListingSummary {
  id: string;
  title?: string | null;
  price?: number | null;
  sellerName?: string | null;
  marketplace?: string | null;
}

interface ScoreSummary {
  listingId: string;
  totalScore: number;
  riskLevel: Score["riskLevel"];
  confidenceBand?: Score["confidenceBand"];
  recommendedAction?: RecommendedAction;
  reasons?: Array<{ ruleName: string; message: string; points: number }>;
}

function statusIcon(s: ReviewStatus) {
  switch (s) { case "confirmed_counterfeit": return <XCircle className="size-4 text-destructive" />; case "rejected_legitimate": return <CheckCircle className="size-4 text-success" />; case "needs_more_evidence": return <HelpCircle className="size-4 text-warning" />; case "escalated": return <AlertTriangle className="size-4 text-destructive" />; default: return <AlertTriangle className="size-4 text-warning" />; }
}

type ReviewPageState = {
  items: ReviewItem[];
  loading: boolean;
  error: string | null;
  listingCount: number;
  scoreCount: number;
  lastUpdated: { listingId: string; status: ReviewStatus; title?: string | null } | null;
};

type ReviewPageAction =
  | { type: "load_started" }
  | { type: "load_finished"; items: ReviewItem[]; listingCount: number; scoreCount: number; error: string | null }
  | { type: "mark_updated"; listingId: string; status: ReviewStatus; title?: string | null };

const initialReviewPageState: ReviewPageState = {
  items: [],
  loading: true,
  error: null,
  listingCount: 0,
  scoreCount: 0,
  lastUpdated: null,
};

function reviewPageReducer(state: ReviewPageState, action: ReviewPageAction): ReviewPageState {
  switch (action.type) {
    case "load_started":
      return { ...state, loading: true };
    case "load_finished":
      return {
        ...state,
        items: action.items,
        listingCount: action.listingCount,
        scoreCount: action.scoreCount,
        error: action.error,
        loading: false,
      };
    case "mark_updated":
      return { ...state, lastUpdated: { listingId: action.listingId, status: action.status, title: action.title } };
  }
}

export default function ReviewPage() {
  const [state, dispatch] = useReducer(reviewPageReducer, initialReviewPageState);
  const { items, loading, error, listingCount, scoreCount, lastUpdated } = state;

  async function load() {
    dispatch({ type: "load_started" });
    try {
      const [decisionsResult, listingsResult, scoresResult] = await Promise.all([
        fetchJsonArray<ReviewItem>("/api/review"),
        fetchJsonArray<ListingSummary>("/api/listings"),
        fetchJsonArray<ScoreSummary>("/api/scoring"),
      ]);
      const listingsById = new Map(listingsResult.data.map((listing) => [listing.id, listing]));
      const scoresByListingId = new Map(scoresResult.data.map((score) => [score.listingId, score]));
      const enriched = decisionsResult.data.map((decision) => ({
        ...decision,
        listing: listingsById.get(decision.listingId),
        score: scoresByListingId.get(decision.listingId) ?? null,
      }));
      dispatch({
        type: "load_finished",
        items: enriched,
        listingCount: listingsResult.data.length,
        scoreCount: scoresResult.data.length,
        error: [decisionsResult.error, listingsResult.error, scoresResult.error].filter(Boolean).join(" ") || null,
      });
    } catch (e) {
      dispatch({
        type: "load_finished",
        items: [],
        listingCount: 0,
        scoreCount: 0,
        error: (e as Error).message,
      });
    }
  }

  useEffect(() => { load(); }, []);

  const queueSummary = summarizeReviewQueue(items.map((item) => item.status));

  if (loading) return <div className="max-w-5xl mx-auto"><h1 className="text-2xl font-bold mb-6">Review Queue</h1><p>Loading internal review items&hellip;</p></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <DemoWorkflowTrail />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apply internal human labels to evidence bundles. This page does not submit reports or trigger enforcement.
        </p>
      </div>
      <section className="surface-card mb-5 rounded-lg p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Total queue</p>
            <p className="mt-1 text-2xl font-bold">{queueSummary.total}</p>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold">{queueSummary.pending}</p>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Labeled</p>
            <p className="mt-1 text-2xl font-bold">{queueSummary.labeled}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{queueSummary.detail}</p>
      </section>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Backend unavailable. Showing available review data only. {error}
        </div>
      )}
      {lastUpdated && (
        <div className="mb-4">
          <ReviewNextSteps listingId={lastUpdated.listingId} status={lastUpdated.status} title={lastUpdated.title} />
        </div>
      )}
      {items.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center">
          {(() => {
            const emptyState = getReviewQueueEmptyState({ listingCount, scoreCount });
            return (
              <>
          <h2 className="text-lg font-semibold">{emptyState.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {emptyState.body}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={emptyState.primaryHref} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              <PlayCircle className="size-4" /> {emptyState.primaryLabel}
            </Link>
            {emptyState.secondaryActions.map((action) => (
              <Link key={action.href + action.label} href={action.href} className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm">
                {action.href.includes("import") ? <Upload className="size-4" /> : <Plus className="size-4" />}
                {action.label}
              </Link>
            ))}
          </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="surface-card rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(item.status)}
                    <span className="font-semibold">{item.listing?.title ?? "Untitled"}</span>
                    <span className="status-pill bg-muted text-muted-foreground">{getReviewStatusPresentation(item.status).label}</span>
                    {item.score && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.score.totalScore >= 50 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        Score: {item.score.totalScore}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.listing?.marketplace} | {item.listing?.sellerName} | Rp {item.listing?.price?.toLocaleString("id-ID") ?? "N/A"}</div>
                  {item.score?.reasons && item.score.reasons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.score.reasons.map((r) => (
                        <p key={`${r.ruleName}-${r.points}-${r.message}`} className="text-xs text-muted-foreground">{r.ruleName}: {r.message}</p>
                      ))}
                    </div>
                  )}
                  <ReviewDecisionPanel
                    className="mt-3"
                    listingId={item.listingId}
                    decision={item}
                    score={item.score ?? null}
                    title={item.listing?.title}
                    onSaved={async (status) => {
                      toast.success(`Review label saved: ${getReviewStatusPresentation(status).label}`);
                      dispatch({ type: "mark_updated", listingId: item.listingId, status, title: item.listing?.title });
                      await load();
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

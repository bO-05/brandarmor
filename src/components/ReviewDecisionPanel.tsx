"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import type { ReviewDecision, ReviewStatus } from "@/domain/types";
import { getAllowedTransitions, isTerminal } from "@/domain/review";
import {
  getReviewConfirmation,
  getReviewStatusPresentation,
  selectReviewAlternativeOptions,
  selectReviewRecommendation,
  type ReviewRecommendationScore,
} from "@/lib/ui-ux";

function toneClass(tone: ReturnType<typeof getReviewStatusPresentation>["tone"]): string {
  switch (tone) {
    case "danger": return "bg-destructive text-destructive-foreground";
    case "success": return "bg-success text-white";
    case "warning": return "bg-warning text-white";
    default: return "bg-secondary text-secondary-foreground";
  }
}

function chooseSuggestedStatus(score: ReviewRecommendationScore | null, allowed: ReviewStatus[]): ReviewStatus | null {
  if (allowed.length === 0) return null;
  const recommendation = selectReviewRecommendation(score);
  if (allowed.includes(recommendation.status)) return recommendation.status;
  if (allowed.includes("needs_more_evidence")) return "needs_more_evidence";
  if (allowed.includes("pending")) return "pending";
  return allowed[0] ?? null;
}

export function ReviewDecisionPanel({
  listingId,
  decision,
  score,
  title,
  onSaved,
  id,
  className = "",
}: {
  listingId: string;
  decision: Pick<ReviewDecision, "status"> | null;
  score: ReviewRecommendationScore | null;
  title?: string | null;
  onSaved?: (status: ReviewStatus) => void | Promise<void>;
  id?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ReviewStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = useMemo(() => decision ? getAllowedTransitions(decision.status) : [], [decision]);
  const suggestedStatus = useMemo(() => chooseSuggestedStatus(score, allowedTransitions), [allowedTransitions, score]);
  const currentPresentation = decision ? getReviewStatusPresentation(decision.status) : null;
  const suggestedPresentation = suggestedStatus ? getReviewStatusPresentation(suggestedStatus) : null;
  const suggestedRecommendation = selectReviewRecommendation(score);
  const otherActions = suggestedStatus
    ? selectReviewAlternativeOptions(suggestedStatus).filter((option) => allowedTransitions.includes(option.status))
    : [];
  const activeSelection = selectedStatus ?? otherActions[0]?.status ?? null;
  const pendingPresentation = pendingStatus ? getReviewStatusPresentation(pendingStatus) : null;
  const confirmation = pendingStatus ? getReviewConfirmation(pendingStatus) : null;
  const terminal = decision ? isTerminal(decision.status) : false;

  useEffect(() => {
    setSelectedStatus(otherActions[0]?.status ?? null);
  }, [suggestedStatus]);

  async function saveStatus() {
    if (!pendingStatus) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, status: pendingStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Review label could not be saved");
      await onSaved?.(pendingStatus);
      setPendingStatus(null);
      setExpanded(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!decision) {
    return (
      <section id={id} className={`rounded-lg border border-border bg-muted/30 p-4 ${className}`}>
        <p className="text-sm font-semibold">Internal review not queued yet</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Run the recommended evidence pipeline first. Once a pending review item exists, the internal label can be applied from this workspace.
        </p>
      </section>
    );
  }

  return (
    <section id={id} className={`rounded-lg border border-border bg-background p-4 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Review decision
          </p>
          <h3 className="mt-1 text-base font-semibold">{title ?? "Evidence bundle"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Current label: <span className="font-semibold text-foreground">{currentPresentation?.label}</span>. Labels stay internal and do not trigger external actions.
          </p>
        </div>
        {currentPresentation && (
          <span className="status-pill bg-muted text-muted-foreground">{currentPresentation.label}</span>
        )}
      </div>

      {terminal ? (
        <div className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
          This review label is terminal in the current workflow. Inspect evidence here or continue to another case from the review queue.
        </div>
      ) : suggestedStatus && suggestedPresentation ? (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Suggested internal label</p>
              <p className="mt-1 text-sm font-semibold">{suggestedPresentation.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {suggestedStatus === suggestedRecommendation.status
                  ? suggestedRecommendation.reason
                  : "This is the safest available next label from the current review state."}
              </p>
            </div>
            <button
              onClick={() => setPendingStatus(suggestedStatus)}
              className={`inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold ${toneClass(suggestedPresentation.tone)}`}
            >
              Confirm suggested label
            </button>
          </div>

          {otherActions.length > 0 && (
            <>
              <button
                onClick={() => setExpanded((value) => !value)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? "Hide alternate label" : "Choose a different label"}
              </button>
              {expanded && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    value={activeSelection ?? ""}
                    onChange={(event) => setSelectedStatus(event.target.value as ReviewStatus)}
                    className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {otherActions.map((option) => (
                      <option key={option.status} value={option.status}>{option.actionLabel}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => activeSelection && setPendingStatus(activeSelection)}
                    disabled={!activeSelection}
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                  >
                    Confirm selected label
                  </button>
                  {activeSelection && (
                    <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
                      {getReviewStatusPresentation(activeSelection).helpText}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {pendingStatus && pendingPresentation && confirmation && (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">{confirmation.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{confirmation.summary}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{confirmation.safetyNote}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={saveStatus}
              disabled={saving}
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : confirmation.confirmLabel}
            </button>
            <button
              onClick={() => setPendingStatus(null)}
              disabled={saving}
              className="inline-flex min-h-9 items-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
            >
              {confirmation.cancelLabel}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </section>
  );
}

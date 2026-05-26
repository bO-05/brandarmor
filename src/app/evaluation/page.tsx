"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Gauge, PlayCircle, Plus, RefreshCw, ShieldAlert, Upload } from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { TermHelp } from "@/components/TermHelp";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api-client";
import { getEvaluationEmptyState, selectEvaluationPlainLanguageSummary, selectEvaluationSummary } from "@/lib/ui-ux";

interface Metrics {
  threshold: number;
  truePositives: number; falsePositives: number; trueNegatives: number; falseNegatives: number;
  precision: number; recall: number; falsePositiveRate: number; falseNegativeRate: number; accuracy: number; precisionAtK: number; reviewBurden: number;
  totalCases: number;
}

interface EvaluationData {
  cases: number;
  metrics: Metrics[];
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isMetric(value: unknown): value is Metrics {
  if (!value || typeof value !== "object") return false;
  const metric = value as Record<string, unknown>;
  return [
    "threshold",
    "truePositives",
    "falsePositives",
    "trueNegatives",
    "falseNegatives",
    "precision",
    "recall",
    "falsePositiveRate",
    "falseNegativeRate",
    "accuracy",
    "precisionAtK",
    "reviewBurden",
    "totalCases",
  ].every((key) => isNumber(metric[key]));
}

function isEvaluationData(value: unknown): value is EvaluationData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return isNumber(data.cases) && Array.isArray(data.metrics) && data.metrics.every(isMetric);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Bar({ value }: { value: number }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return <div className="bar-track"><div className="bar-fill" style={{ width }} /></div>;
}

export default function EvaluationPage() {
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalTable, setShowTechnicalTable] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const [reviewDecisionCount, setReviewDecisionCount] = useState(0);

  async function load(compute: boolean = true) {
    setLoading(true);
    try {
      const [result, listingsResult, reviewResult] = await Promise.all([
        fetchJsonObject<EvaluationData>(
          `/api/evaluation${compute ? "?compute=true" : ""}`,
          { cases: 0, metrics: [] },
          { validate: isEvaluationData }
        ),
        fetchJsonArray<unknown>("/api/listings"),
        fetchJsonArray<unknown>("/api/review"),
      ]);
      setData(result.data);
      setListingCount(listingsResult.data.length);
      setReviewDecisionCount(reviewResult.data.length);
      setError([result.error, listingsResult.error, reviewResult.error].filter(Boolean).join(" ") || null);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="max-w-5xl mx-auto"><h1 className="text-2xl font-bold mb-6">Evaluation</h1><p>Computing pilot metrics...</p></div>;
  if (!data) return null;

  const summary = selectEvaluationSummary(data);
  const best = summary.best;
  const plainSummary = selectEvaluationPlainLanguageSummary(summary);

  return (
    <div className="mx-auto max-w-6xl">
      <DemoWorkflowTrail />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evaluation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pilot metrics show how routing thresholds affect reviewer precision and workload. They do not prove production accuracy.
          </p>
        </div>
        <button onClick={() => load(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          <RefreshCw className="h-4 w-4" /> Recompute
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Backend unavailable. Showing empty metrics. {error}
        </div>
      )}

      {data.metrics.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center">
          {(() => {
            const emptyState = getEvaluationEmptyState({ listingCount, reviewDecisionCount });
            return (
              <>
          <h2 className="text-lg font-semibold">{emptyState.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {emptyState.body}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={emptyState.primaryHref} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
              <PlayCircle className="h-4 w-4" /> {emptyState.primaryLabel}
            </Link>
            {emptyState.secondaryActions.map((action) => (
              <Link key={action.href + action.label} href={action.href} className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground">
                {action.href.includes("import") ? <Upload className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {action.label}
              </Link>
            ))}
          </div>
              </>
            );
          })()}
        </div>
      ) : (
        <>
          {summary.metricDisplayMode === "guarded" && (
            <section className="mb-5 rounded-lg border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <h2 className="font-semibold text-warning">{summary.limitHeadline}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {summary.datasetLabel}. {summary.limitNote} Percentages below are useful for demo tuning, but they should not be read as operational accuracy.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="surface-card mb-5 rounded-lg p-5">
            <h2 className="font-semibold">Stakeholder readout</h2>
            <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-4">
              <p className="text-base font-semibold">{plainSummary.headline}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{plainSummary.detail}</p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold">What the score does</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  It chooses which listings deserve reviewer attention first. It is not an authenticity decision.
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold">Best current cutoff</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {best ? `At score ${best.threshold}, the pilot routes ${percent(best.reviewBurden)} of cases for review.` : "No cutoff is available until metrics are computed."}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold">Limit</p>
                <p className="mt-1 text-sm text-muted-foreground">{summary.limitNote}</p>
              </div>
            </div>
          </section>

          <section className="mb-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="surface-card rounded-lg p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Best pilot threshold</h2>
              </div>
              {best && (
                <div>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold">{best.threshold}</p>
                    <p className="pb-1 text-sm text-muted-foreground">score cutoff for routing to review</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{summary.datasetLabel}. {summary.limitNote}</p>
                  <div className="mt-5 grid gap-3">
                    <div>
                      <div className="mb-1 flex justify-between text-sm"><span>Precision</span><b>{summary.metricDisplayMode === "guarded" ? `${percent(best.precision)} pilot` : percent(best.precision)}</b></div>
                      <Bar value={best.precision} />
                      <p className="mt-1 text-xs text-muted-foreground">Of cases routed to review, how many matched suspicious/unsafe labels in the pilot set.</p>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-sm"><span>Recall</span><b>{summary.metricDisplayMode === "guarded" ? `${percent(best.recall)} pilot` : percent(best.recall)}</b></div>
                      <Bar value={best.recall} />
                      <p className="mt-1 text-xs text-muted-foreground">Of suspicious/unsafe pilot cases, how many the threshold routed to review.</p>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-sm"><span><TermHelp term="review_burden" /></span><b>{percent(best.reviewBurden)}</b></div>
                      <Bar value={best.reviewBurden} />
                      <p className="mt-1 text-xs text-muted-foreground">Share of all pilot cases a reviewer would need to inspect.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-card rounded-lg p-5">
                <Gauge className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground"><TermHelp term="f1" /></p>
                <p className="mt-1 text-2xl font-bold">{summary.f1.toFixed(3)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Single-number balance of precision and recall for the selected threshold.</p>
              </div>
              <div className="surface-card rounded-lg p-5">
                <ShieldAlert className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">False positive rate</p>
                <p className="mt-1 text-2xl font-bold">{best ? percent(best.falsePositiveRate) : "0%"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Lower is safer because fewer legitimate cases are routed as suspicious.</p>
              </div>
              <div className="surface-card rounded-lg p-5 sm:col-span-2">
                <p className="text-sm font-semibold">How to read this page</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Higher precision reduces wasted reviewer time. Higher recall catches more suspicious or unsafe pilot cases. Review burden shows how much manual work a threshold creates.
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-lg p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Optional technical threshold table</h2>
                <p className="mt-1 text-sm text-muted-foreground">TP/FP/TN/FN details for people tuning thresholds after reading the stakeholder summary.</p>
              </div>
              <button
                onClick={() => setShowTechnicalTable((value) => !value)}
                className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
              >
                {showTechnicalTable ? "Hide technical table" : "Show technical table"}
              </button>
            </div>
            {showTechnicalTable && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3">Threshold</th>
                      <th className="text-left py-2 px-3">TP</th>
                      <th className="text-left py-2 px-3">FP</th>
                      <th className="text-left py-2 px-3">TN</th>
                      <th className="text-left py-2 px-3">FN</th>
                      <th className="text-left py-2 px-3">Precision</th>
                      <th className="text-left py-2 px-3">Recall</th>
                      <th className="text-left py-2 px-3">FPR</th>
                      <th className="text-left py-2 px-3">FNR</th>
                      <th className="text-left py-2 px-3">Accuracy</th>
                      <th className="text-left py-2 px-3"><TermHelp term="precision_at_k" /></th>
                      <th className="text-left py-2 px-3"><TermHelp term="review_burden" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.metrics.map((m) => (
                      <tr key={m.threshold} className="border-b border-border">
                        <td className="py-2 px-3 font-semibold">{m.threshold}</td>
                        <td className="py-2 px-3">{m.truePositives}</td>
                        <td className="py-2 px-3">{m.falsePositives}</td>
                        <td className="py-2 px-3">{m.trueNegatives}</td>
                        <td className="py-2 px-3">{m.falseNegatives}</td>
                        <td className={`py-2 px-3 ${m.precision >= 0.7 ? "text-success" : m.precision >= 0.5 ? "text-warning" : "text-destructive"}`}>{m.precision.toFixed(3)}</td>
                        <td className={`py-2 px-3 ${m.recall >= 0.7 ? "text-success" : m.recall >= 0.5 ? "text-warning" : "text-destructive"}`}>{m.recall.toFixed(3)}</td>
                        <td className="py-2 px-3">{m.falsePositiveRate.toFixed(3)}</td>
                        <td className="py-2 px-3">{m.falseNegativeRate.toFixed(3)}</td>
                        <td className={`py-2 px-3 font-semibold ${m.accuracy >= 0.7 ? "text-success" : m.accuracy >= 0.5 ? "text-warning" : "text-destructive"}`}>{m.accuracy.toFixed(3)}</td>
                        <td className="py-2 px-3">{m.precisionAtK.toFixed(3)}</td>
                        <td className="py-2 px-3">{m.reviewBurden.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

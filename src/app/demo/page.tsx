"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ArrowRight, Bot, CheckCircle2, CircleDashed, ClipboardCheck, Clock3, Gauge, Loader2, Play, ScanText, ShieldCheck, Timer, XCircle } from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { buildDemoSignalBadges, type DemoSignalBadge } from "@/lib/demo-signals";
import type { OperationState } from "@/lib/ui-ux";

interface Readiness {
  mistralConfigured: boolean;
  anthropicConfigured: boolean;
  dataWritable: boolean;
  brandCount: number;
  productCount: number;
  listingCount: number;
  demoReady: boolean;
}

interface DemoRun {
  listingId: string;
  listingUrl: string;
  usedMockOcr: boolean;
  nextStep: { id: "judge"; endpoint: string; label: string };
  timings: Record<string, number>;
  status: {
    ocrProvider: string;
    usedMockOcr: boolean;
    regulatoryProvider: string;
    regulatoryStatus: string;
    bpomStatus: string | null;
    bpomLookupDurationMs: number | null;
    visualProvider: string;
    visualStatus: "match" | "mismatch" | "inconclusive" | "not_available";
  };
  score?: { totalScore: number; riskLevel: string; confidenceBand: string };
  reviewUrl: string;
  evaluationUrl: string;
}

interface JudgeResult {
  provider: "anthropic" | "mistral" | "mock";
  model: string;
  judgeRisk: string;
  confidence: string;
  missingEvidence: string[];
  citedEvidenceIds: string[];
}

type DemoStage = "idle" | "core" | "judge" | "complete" | "failed";

const signalOrder: Array<"ocr" | "bpom" | "visual" | "judge"> = ["ocr", "bpom", "visual", "judge"];

function StateIcon({ state }: { state: OperationState }) {
  if (state === "completed") return <CheckCircle2 className="size-4 text-success" />;
  if (state === "running") return <Loader2 className="size-4 animate-spin text-warning" />;
  if (state === "failed") return <XCircle className="size-4 text-destructive" />;
  return <CircleDashed className="size-4 text-muted-foreground" />;
}

function stageCopy(stage: DemoStage): string {
  switch (stage) {
    case "core": return "Collecting OCR, regulatory, visual, and deterministic score evidence.";
    case "judge": return "Core evidence is saved. Asking the evidence judge for a cited assessment; it will fall back honestly if the provider is slow or unavailable.";
    case "complete": return "Evidence path completed. Open the case to inspect the review trail and export the report.";
    case "failed": return "The last stage did not complete. Saved core evidence remains available for review or a retry.";
    default: return "Ready to run a staged, evidence-first demo.";
  }
}

function formatMs(value: number | null | undefined): string {
  if (value == null) return "—";
  return value < 1_000 ? `${value}ms` : `${(value / 1_000).toFixed(1)}s`;
}

function ProvenanceBadge({ signal }: { signal: DemoSignalBadge }) {
  const tone = signal.mode === "real"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : signal.mode === "roadmap"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{signal.label}</span>
        <span className="rounded-sm bg-white/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal">{signal.mode}</span>
      </div>
      <p className="mt-1 text-xs leading-5 opacity-85">{signal.provider}{signal.detail ? ` / ${signal.detail}` : ""}</p>
    </div>
  );
}

function ProgressStep({ title, detail, icon: Icon, state }: { title: string; detail: string; icon: ComponentType<{ className?: string }>; state: OperationState }) {
  return (
    <div className={`rounded-md border border-border p-3 ${state === "running" ? "bg-primary/5" : "bg-background"}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-auto"><StateIcon state={state} /></span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function DemoPage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [result, setResult] = useState<DemoRun | null>(null);
  const [judge, setJudge] = useState<JudgeResult | null>(null);
  const [stage, setStage] = useState<DemoStage>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function loadReadiness() {
    const res = await fetch("/api/health/demo-readiness");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Readiness check failed");
    setReadiness(json);
  }

  useEffect(() => { loadReadiness().catch(() => setError("Demo readiness could not be loaded.")); }, []);

  useEffect(() => {
    if (!loading || startedAt == null) return;
    const update = () => setElapsed(Date.now() - startedAt);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [loading, startedAt]);

  const signals = useMemo(() => result && judge ? buildDemoSignalBadges({
    ocrProvider: result.status.ocrProvider as "mistral" | "mock",
    regulatoryProvider: result.status.regulatoryProvider as "bpom_manual" | "bpom_linkout" | "bpom_api" | "mock",
    visualProvider: result.status.visualProvider as "mock" | "siglip_adapter" | "manual",
    visualStatus: result.status.visualStatus,
    judgeProvider: judge.provider,
    regulatoryStatus: result.status.regulatoryStatus as never,
    bpomStatus: result.status.bpomStatus,
    bpomLookupDurationMs: result.status.bpomLookupDurationMs,
  }) : null, [judge, result]);

  const steps: Array<{ title: string; detail: string; icon: ComponentType<{ className?: string }>; state: OperationState }> = [
    {
      title: "Prepare demo case",
      detail: "Seed the deterministic demo dataset and select the flagship listing.",
      icon: CheckCircle2,
      state: result ? "completed" : stage === "core" ? "running" : "queued",
    },
    {
      title: "Collect core evidence",
      detail: "Run OCR or a labeled demo fixture, BPOM/NIE, visual state, and deterministic scoring.",
      icon: ScanText,
      state: result ? "completed" : stage === "core" ? "running" : stage === "failed" ? "failed" : "queued",
    },
    {
      title: "Run evidence judge",
      detail: "Request a cited assessment only after core evidence is stored; a fallback remains explicitly labeled.",
      icon: Bot,
      state: judge ? "completed" : stage === "judge" ? "running" : stage === "failed" && result ? "failed" : "queued",
    },
    {
      title: "Hand off to human review",
      detail: "Open the case, inspect the investigation trail, apply an internal label, or export evidence.",
      icon: ClipboardCheck,
      state: stage === "complete" ? "completed" : "queued",
    },
  ];

  async function runDemo() {
    setLoading(true);
    setError(null);
    setResult(null);
    setJudge(null);
    setStage("core");
    const now = Date.now();
    setStartedAt(now);
    setElapsed(0);

    try {
      const coreResponse = await fetch("/api/demo/run", { method: "POST" });
      const coreJson = await coreResponse.json();
      if (!coreResponse.ok) throw new Error(coreJson.error ?? "Core evidence stage failed");
      setResult(coreJson);

      setStage("judge");
      const judgeResponse = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: coreJson.listingId, forceMock: false }),
      });
      const judgeJson = await judgeResponse.json();
      if (!judgeResponse.ok) throw new Error(judgeJson.error ?? "Evidence judge stage failed");
      setJudge(judgeJson);
      setStage("complete");
      void loadReadiness().catch(() => undefined);
    } catch (caught) {
      setStage("failed");
      setError((caught as Error).message || "The demo did not complete. Retry the demo or inspect the saved core evidence.");
    } finally {
      setElapsed(Date.now() - now);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <DemoWorkflowTrail />

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Guided evidence path</p>
        <h1 className="mt-1 text-2xl font-bold">Run a reliable, claim-safe demo.</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">Core evidence is saved before the LLM judge runs, so a slow provider cannot erase the reviewer-ready case. Every result names whether it is real, mock, or roadmap-only.</p>
      </div>

      <section className="surface-card mb-5 rounded-lg p-5" aria-busy={loading}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Run one complete evidence path</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">The demo saves the core case first, then requests the evidence judge as a separately visible stage with a bounded fallback.</p>
          </div>
          <button type="button" onClick={runDemo} disabled={loading} className="pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {loading ? "Running evidence path..." : "Run Demo Pipeline"}
          </button>
        </div>
        <div className="mt-4 rounded-md border border-border bg-background p-3" aria-live="polite" role="status">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">{stageCopy(stage)}</p>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Timer className="size-3.5" /> {formatMs(elapsed)}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">The judge stage is capped and has a clearly labeled fallback; the listing remains available even if it cannot finish.</p>
        </div>
        {error && <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="surface-card rounded-lg p-5">
          <h2 className="font-semibold">Readiness</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {[
              ["Mistral OCR key", readiness?.mistralConfigured ? "configured" : "missing; mock OCR is labeled"],
              ["Anthropic judge key", readiness?.anthropicConfigured ? "configured" : "missing; fallback is labeled"],
              ["Data directory", readiness?.dataWritable ? "writable" : "not writable"],
              ["Demo records", `${readiness?.brandCount ?? "-"} brands / ${readiness?.productCount ?? "-"} products / ${readiness?.listingCount ?? "-"} listings`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2">
                <span>{label}</span>
                <span className="text-right text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-lg p-5">
          <h2 className="font-semibold">Live progress</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {steps.map((step) => <ProgressStep key={step.title} {...step} />)}
          </div>
        </section>
      </div>

      {result && (
        <section className="surface-card mt-5 rounded-lg p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Demo result</p>
              <h2 className="mt-1 text-lg font-bold">{stage === "complete" ? "Evidence bundle is ready for review." : "Core evidence bundle is saved."}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Core stage: {formatMs(result.timings.core)} • OCR: {formatMs(result.timings.ocr)} • BPOM/NIE: {formatMs(result.timings.regulatory)} • Score: {formatMs(result.timings.scoring)}</p>
            </div>
            {result.score && <span className="status-pill bg-muted text-muted-foreground">Score {result.score.totalScore} / {result.score.riskLevel}</span>}
          </div>

          {signals ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {signalOrder.map((key) => <ProvenanceBadge key={key} signal={signals[key]} />)}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <ProvenanceBadge signal={{ label: "OCR", mode: result.status.usedMockOcr ? "mock" : "real", provider: result.status.ocrProvider, detail: result.status.usedMockOcr ? "demo OCR fixture" : "Mistral OCR" }} />
              <ProvenanceBadge signal={{ label: "BPOM", mode: result.status.regulatoryProvider === "bpom_api" ? "real" : "mock", provider: result.status.regulatoryProvider, detail: result.status.regulatoryStatus }} />
              <ProvenanceBadge signal={{ label: "Visual check", mode: result.status.visualStatus === "not_available" ? "roadmap" : "mock", provider: result.status.visualStatus === "not_available" ? "not run in demo" : result.status.visualProvider, detail: result.status.visualStatus === "not_available" ? "No official and suspect image pair is available." : result.status.visualStatus }} />
            </div>
          )}

          {judge && (
            <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
              <p className="font-semibold">Evidence judge: {judge.judgeRisk.replaceAll("_", " ")} / {judge.confidence} confidence</p>
              <p className="mt-1 text-muted-foreground">{judge.citedEvidenceIds.length} cited evidence ID{judge.citedEvidenceIds.length === 1 ? "" : "s"}; {judge.missingEvidence.length ? `${judge.missingEvidence.length} evidence gap${judge.missingEvidence.length === 1 ? "" : "s"} remain.` : "no additional evidence gap returned."}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={result.listingUrl} className="pressable inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><ClipboardCheck className="size-4" /> Open demo listing</Link>
            <Link href={result.reviewUrl} className="pressable inline-flex min-h-10 items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">Open review queue <ArrowRight className="size-4" /></Link>
            <Link href={result.evaluationUrl} className="pressable inline-flex min-h-10 items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Gauge className="size-4" /> View metrics</Link>
          </div>
        </section>
      )}

      <section className="surface-card mt-5 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-semibold">What happens if a provider is slow?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">OCR, judge, discovery, and BPOM paths use bounded requests. The app persists the available evidence, reports the unavailable step safely, and labels any fallback as mock or roadmap rather than presenting it as a real result.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

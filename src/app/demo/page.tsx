"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { Bot, CheckCircle2, CircleDashed, ClipboardCheck, Gauge, Loader2, Play, ScanText, ShieldCheck, XCircle } from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
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
  status?: {
    ocrProvider: string;
    usedMockOcr: boolean;
    regulatoryProvider: string;
    regulatoryStatus: string;
    bpomStatus: string | null;
    bpomLookupDurationMs: number | null;
    visualProvider: string;
    visualStatus: string;
    judgeProvider: string;
    usedMockJudge: boolean;
  };
  signals?: Record<"ocr" | "bpom" | "visual" | "judge", {
    label: string;
    mode: "real" | "mock";
    provider: string;
    detail: string | null;
  }>;
  score?: { totalScore: number; riskLevel: string; confidenceBand: string };
  judge?: { provider: string; judgeRisk: string; confidence: string; missingEvidence: string[] };
}

const signalOrder: Array<"ocr" | "bpom" | "visual" | "judge"> = ["ocr", "bpom", "visual", "judge"];

function StateIcon({ state }: { state: OperationState }) {
  if (state === "completed") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (state === "running") return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
  if (state === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
  return <CircleDashed className="w-4 h-4 text-muted-foreground" />;
}

function ProvenanceBadge({ signal }: { signal: NonNullable<DemoRun["signals"]>[keyof NonNullable<DemoRun["signals"]>] }) {
  const tone = signal.mode === "real"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{signal.label}</span>
        <span className="rounded-sm bg-white/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal">{signal.mode}</span>
      </div>
      <p className="mt-1 text-xs opacity-85">{signal.provider}{signal.detail ? ` / ${signal.detail}` : ""}</p>
    </div>
  );
}

export default function DemoPage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [result, setResult] = useState<DemoRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReadiness() {
    const res = await fetch("/api/health/demo-readiness");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Readiness check failed");
    setReadiness(json);
  }

  useEffect(() => { loadReadiness().catch((e) => setError((e as Error).message)); }, []);

  async function runDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Demo pipeline failed");
      setResult(json);
      await loadReadiness();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const steps: Array<{ title: string; icon: ComponentType<{ className?: string }>; state: OperationState }> = [
    { title: "Seed cosmetics baseline/listing", icon: CheckCircle2, state: result || readiness?.demoReady ? "completed" : loading ? "running" : "queued" },
    { title: "Run Mistral OCR or mock OCR", icon: ScanText, state: result ? "completed" : loading ? "running" : "queued" },
    { title: "Run BPOM + visual + scoring", icon: ShieldCheck, state: result?.score ? "completed" : loading ? "running" : "queued" },
    { title: "Run evidence judge", icon: Bot, state: result?.judge ? "completed" : loading ? "running" : "queued" },
    { title: "Open internal review queue", icon: ClipboardCheck, state: result ? "queued" : "queued" },
    { title: "Read evaluation snapshot", icon: Gauge, state: result ? "queued" : "queued" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <DemoWorkflowTrail />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">First-Time Demo</h1>
        <p className="text-muted-foreground">One guided path from empty workspace to an evidence-backed cosmetics risk assessment.</p>
      </div>

      <section className="surface-card rounded-lg p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Run one complete evidence path</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Seed the demo case, collect available evidence, compute the advisory routing score, and prepare the internal review item.
            </p>
          </div>
          <button onClick={runDemo} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Demo Pipeline
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>

      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
        <section className="surface-card rounded-lg p-5">
          <h2 className="font-semibold mb-3">Readiness</h2>
          <div className="grid gap-2 text-sm">
            {[
              ["Mistral OCR key", readiness?.mistralConfigured ? "configured" : "missing; mock OCR available"],
              ["Anthropic judge key", readiness?.anthropicConfigured ? "configured" : "missing; Mistral/mock fallback available"],
              ["Data directory", readiness?.dataWritable ? "writable" : "not writable"],
              ["Brands", String(readiness?.brandCount ?? "-")],
              ["Products", String(readiness?.productCount ?? "-")],
              ["Listings", String(readiness?.listingCount ?? "-")],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2">
                <span>{label}</span>
                <span className="text-muted-foreground text-right">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-lg p-5">
          <h2 className="font-semibold mb-3">Workflow</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {steps.map(({ title, icon: Icon, state }, index) => (
              <div key={title} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{index + 1}. {title}</span>
                  <span className="ml-auto"><StateIcon state={state} /></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {result && (
        <section className="surface-card rounded-lg p-5 mt-5">
          <h2 className="font-semibold mb-3">Demo Result</h2>
          {result.signals && (
            <div className="mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {signalOrder.map((key) => <ProvenanceBadge key={key} signal={result.signals![key]} />)}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-muted p-3"><b>OCR mode</b><p>{result.usedMockOcr ? "mock/demo OCR" : "Mistral OCR"}</p></div>
            <div className="rounded-md bg-muted p-3"><b>BPOM status</b><p>{result.status ? `${result.status.regulatoryProvider}: ${result.status.regulatoryStatus}` : "not available"}</p></div>
            <div className="rounded-md bg-muted p-3"><b>Risk score</b><p>{result.score ? `${result.score.totalScore} (${result.score.riskLevel})` : "not available"}</p></div>
            <div className="rounded-md bg-muted p-3"><b>Visual</b><p>{result.status ? `${result.status.visualProvider}: ${result.status.visualStatus}` : "not available"}</p></div>
            <div className="rounded-md bg-muted p-3"><b>Judge</b><p>{result.judge ? `${result.judge.provider}: ${result.judge.judgeRisk}` : "not available"}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={result.listingUrl} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Open Demo Listing</Link>
            <Link href="/review" className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground">Send to Review</Link>
            <Link href="/evaluation" className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground">View Metrics</Link>
          </div>
        </section>
      )}
    </div>
  );
}

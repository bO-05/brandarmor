"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileInput,
  Package,
  PlayCircle,
  Plus,
  Route,
  Search,
  Sparkles,
  Shield,
} from "lucide-react";
import { useAmbientStatus } from "@/components/AmbientStatusProvider";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { IntegrationLedger } from "@/components/IntegrationLedger";
import { selectAmbientStatus } from "@/lib/ui-ux";

interface DashboardData {
  brands: number;
  listings: number;
  unlinkedListings: number;
  unscoredListings: number;
  pendingReviews: number;
  highRisk: number;
  reviewDecisions: number;
  evaluationCases: number;
  readiness?: {
    mistralConfigured: boolean;
    anthropicConfigured: boolean;
    dataWritable: boolean;
    demoReady: boolean;
  };
}

const workflow = [
  "Seed cosmetics baseline and listing",
  "Extract OCR, BPOM/NIE, visual, score, and judge evidence",
  "Open the listing workspace and apply an internal review label",
];


const scrollWorldScenes = [
  {
    step: "01",
    label: "Lead intake",
    title: "A suspicious skincare listing enters the watch desk.",
    detail: "BrandArmor treats marketplace records as leads, not conclusions. The listing starts as a routed candidate with source context and visible gaps.",
    tone: "from-sky-500/25 via-indigo-500/15 to-transparent",
    artifact: "Marketplace listing",
  },
  {
    step: "02",
    label: "Evidence chain",
    title: "OCR, regulatory, visual, score, and judge signals attach as cited evidence.",
    detail: "Each signal stays tied to a record the reviewer can inspect. Mock fallbacks remain labeled, and missing proof stays visible.",
    tone: "from-violet-500/25 via-fuchsia-500/15 to-transparent",
    artifact: "Evidence records",
  },
  {
    step: "03",
    label: "Human review",
    title: "The case lands with a reviewer for an internal decision.",
    detail: "Scores and judge output help prioritize attention, while the human label remains the accountable review step.",
    tone: "from-emerald-500/25 via-teal-500/15 to-transparent",
    artifact: "Reviewer queue",
  },
];

function ScrollWorldLanding({ hasData, pendingReviews }: { hasData: boolean; pendingReviews: number }) {
  return (
    <section className="scroll-world mb-8 overflow-hidden rounded-2xl border border-border bg-foreground text-primary-foreground shadow-2xl shadow-foreground/10">
      <div className="scroll-world__hero relative min-h-[92svh] px-5 py-6 md:px-8 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.2),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(125,211,252,0.22),transparent_28%),linear-gradient(135deg,rgba(59,130,246,0.18),transparent_45%)]" />
        <div className="relative z-10 grid min-h-[calc(92svh-3rem)] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
              <Sparkles className="size-3.5" />
              Scroll world pilot
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
              Fly through the evidence path before opening the workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 md:text-lg">
              A scroll-scrubbed landing story for BrandArmor: lead intake, cited evidence, and human review. It routes suspicious marketplace listings for evidence-backed review; it does not automatically confirm counterfeits.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={hasData ? "/review" : "/demo"} className="pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-foreground">
                {hasData ? `Review ${pendingReviews} pending` : "Run guided demo"}
                <ArrowRight className="size-4" />
              </Link>
              <a href="#workspace-status" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10">
                Continue to dashboard
                <ArrowDown className="size-4" />
              </a>
            </div>
          </div>
          <div className="scroll-world__viewport" aria-hidden="true">
            <div className="scroll-world__stage">
              {scrollWorldScenes.map((scene, index) => (
                <div key={scene.step} className={`scroll-world__card scroll-world__card--${index + 1}`}>
                  <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${scene.tone}`} />
                  <div className="relative z-10 flex h-full flex-col justify-between p-5">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                      <span>{scene.label}</span>
                      <span>{scene.step}</span>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur">
                      <p className="text-sm font-semibold text-white/60">{scene.artifact}</p>
                      <p className="mt-2 text-xl font-black text-white">{scene.title}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="scroll-world__orbit scroll-world__orbit--one" />
              <div className="scroll-world__orbit scroll-world__orbit--two" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 grid border-t border-white/10 bg-black/20 md:grid-cols-3">
        {scrollWorldScenes.map((scene) => (
          <article key={scene.step} className="border-white/10 p-5 md:border-r last:md:border-r-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{scene.step} / {scene.label}</p>
            <h2 className="mt-3 text-lg font-bold text-white">{scene.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">{scene.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const setupActions = [
  { label: "Brand baselines", detail: "Manage official product truth.", href: "/brands", icon: Building2 },
  { label: "Discover candidates", detail: "Find leads without treating search as proof.", href: "/discovery", icon: Search },
  { label: "Add listing", detail: "Create a manual evidence record.", href: "/listings/new", icon: Plus },
  { label: "Import listings", detail: "Paste JSON records for batch intake.", href: "/listings/import", icon: FileInput },
  { label: "Review queue", detail: "Apply internal human labels.", href: "/review", icon: ClipboardCheck },
  { label: "Evaluation", detail: "Inspect pilot metrics and review burden.", href: "/evaluation", icon: BarChart3 },
];

export default function DashboardPage({ initialData }: { initialData: DashboardData }) {
  const ambient = useAmbientStatus();
  const data = ambient ? {
    ...initialData,
    listings: ambient.listingCount,
    unlinkedListings: ambient.unlinkedListingCount,
    unscoredListings: ambient.unscoredListingCount,
    pendingReviews: ambient.pendingReviewCount,
    highRisk: ambient.highRiskScoreCount,
    reviewDecisions: ambient.reviewDecisionCount,
  } : initialData;
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function seedDemoData() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Seed failed");
      location.reload();
    } catch (e) {
      setError((e as Error).message);
      setSeeding(false);
    }
  }

  const hasData = Boolean((data?.brands ?? 0) + (data?.listings ?? 0));
  const ambientStatus = data ? selectAmbientStatus({
    listingCount: data.listings,
    unlinkedListingCount: data.unlinkedListings,
    unscoredListingCount: data.unscoredListings,
    pendingReviewCount: data.pendingReviews,
    highRiskScoreCount: data.highRisk,
    evaluationCaseCount: data.evaluationCases,
    reviewDecisionCount: data.reviewDecisions,
    currentPath: "/",
  }) : null;

  const secondaryStatusItems = ambientStatus?.items.filter((item) => item.id !== "pending_reviews") ?? [];

  const stats = [
    { label: "Baselines", value: data?.brands ?? "-", detail: "brands with product truth", icon: Building2, href: "/brands" },
    { label: "Listings", value: data?.listings ?? "-", detail: "candidate marketplace records", icon: Package, href: "/listings" },
    { label: "Pending Review", value: data?.pendingReviews ?? "-", detail: "internal human labels waiting", icon: ClipboardCheck, href: "/review" },
    { label: "High Routing Risk", value: data?.highRisk ?? "-", detail: "score says review first", icon: AlertTriangle, href: "/review" },
  ];

  const nextActions = [
    { label: "Continue review", detail: `${data?.pendingReviews ?? 0} pending internal labels`, href: "/review", icon: ClipboardCheck },
    { label: "Open listings", detail: `${data?.listings ?? 0} candidate records`, href: "/listings", icon: Package },
    { label: "View evaluation", detail: "Check pilot routing metrics", href: "/evaluation", icon: BarChart3 },
  ];

  const actions = setupActions;

  if (error) {
    return <div className="p-6 text-destructive">Error: {error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ScrollWorldLanding hasData={hasData} pendingReviews={data?.pendingReviews ?? 0} />
      <div id="workspace-status" className="scroll-mt-6">
        <DemoWorkflowTrail />

      {hasData && (
        <section className="surface-card mb-6 rounded-lg p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Returning workspace</p>
              <h1 className="mt-1 text-2xl font-bold">Continue evidence-backed review.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Pick up the demo path from the review queue, listing workspace, or evaluation snapshot. Scores remain advisory and labels stay internal.
              </p>
            </div>
            <Link href="/demo" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
              <PlayCircle className="size-4" />
              Run demo again
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {nextActions.map(({ label, detail, href, icon: Icon }) => (
              <Link key={label} href={href} className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-muted">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {ambientStatus && secondaryStatusItems.length > 0 && (
            <div className="mt-5 rounded-md border border-border bg-background p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{ambientStatus.headline}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{ambientStatus.summary}</p>
                </div>
                <Link href={ambientStatus.nextActionHref} className="inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                  {ambientStatus.nextActionLabel}
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {secondaryStatusItems.slice(0, 2).map((item) => (
                  <Link key={item.id} href={item.href} className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-muted/70">
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className={`mb-6 grid gap-4 ${hasData ? "lg:grid-cols-1" : "lg:grid-cols-[1.35fr_0.65fr]"}`}>
        {!hasData && (
          <div className="surface-card rounded-lg p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <Shield className="size-3.5" />
                  Evidence-backed suspicious listing review
                </div>
                <h1 className="max-w-2xl text-3xl font-bold tracking-normal">Start with one guided evidence review.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  BrandArmor routes suspicious skincare and cosmetics listings for review. Scores and judge output are advisory; human reviewers decide the internal label.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                {workflow.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/demo" className="pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <PlayCircle className="size-4" />
                Run Guided Demo
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="surface-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <h2 className="font-semibold">Demo readiness</h2>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2">
              <span>OCR</span>
              <span className="text-right text-muted-foreground">{data?.readiness?.mistralConfigured ? "Mistral configured" : "mock fallback available"}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2">
              <span>Judge</span>
              <span className="text-right text-muted-foreground">{data?.readiness?.anthropicConfigured ? "Anthropic configured" : "fallback available"}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2">
              <span>Local data</span>
              <span className="text-right text-muted-foreground">{data?.readiness?.dataWritable ? "writable" : "check data folder"}</span>
            </div>
          </div>
          {!hasData && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-semibold">Workspace is empty.</p>
              <p className="mt-1 text-muted-foreground">Use the guided demo first. Seed-only is available when you want data without running the full evidence path.</p>
              <button type="button"
                onClick={seedDemoData}
                disabled={seeding}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
              >
                <CheckCircle2 className="size-4" />
                {seeding ? "Seeding..." : "Seed demo data only"}
              </button>
            </div>
          )}
        </div>
      </section>

      {hasData && (
        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, detail, icon: Icon, href }) => (
            <Link key={label} href={href} className="surface-card hover-lift rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
                <Icon className="size-5 text-primary" />
              </div>
            </Link>
          ))}
        </section>
      )}

      {hasData && (
        <section className="surface-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Route className="size-5 text-primary" />
            <div>
              <h2 className="font-semibold">After the demo</h2>
              <p className="text-sm text-muted-foreground">Use these paths for real review work once the core workflow makes sense.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actions.map(({ label, detail, href, icon: Icon }) => (
              <Link key={label} href={href} className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <IntegrationLedger />

      </div>

      <details className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Local demo command</summary>
        <p className="mt-2 text-sm text-muted-foreground">Use this only when starting the app from a terminal.</p>
        <code className="mt-3 block rounded-md bg-background px-3 py-2 text-sm">npm run dev -- -p 3015</code>
      </details>
    </div>
  );
}

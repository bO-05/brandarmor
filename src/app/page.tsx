"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
  Shield,
} from "lucide-react";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { selectAmbientStatus } from "@/lib/ui-ux";
import type { Listing, ReviewDecision, Score } from "@/domain/types";

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [brands, listings, reviews, scores, readiness, evaluation] = await Promise.all([
          fetch("/api/brands").then((r) => r.json()),
          fetch("/api/listings").then((r) => r.json()),
          fetch("/api/review").then((r) => r.json()),
          fetch("/api/scoring").then((r) => r.json()),
          fetch("/api/health/demo-readiness").then((r) => r.json()),
          fetch("/api/evaluation").then((r) => r.json()),
        ]);
        const listingRows = Array.isArray(listings) ? listings as Listing[] : [];
        const scoreRows = Array.isArray(scores) ? scores as Score[] : [];
        const reviewRows = Array.isArray(reviews) ? reviews as ReviewDecision[] : [];
        const scoredListingIds = new Set(scoreRows.map((score) => score.listingId));
        setData({
          brands: Array.isArray(brands) ? brands.length : 0,
          listings: listingRows.length,
          unlinkedListings: listingRows.filter((listing) => !listing.productId).length,
          unscoredListings: listingRows.filter((listing) => !scoredListingIds.has(listing.id)).length,
          pendingReviews: reviewRows.filter((review) => review.status === "pending").length,
          highRisk: scoreRows.filter((score) => score.riskLevel === "high" || score.riskLevel === "critical").length,
          reviewDecisions: reviewRows.length,
          evaluationCases: typeof evaluation?.cases === "number" ? evaluation.cases : 0,
          readiness: readiness?.error ? undefined : readiness,
        });
      } catch (e) {
        setError((e as Error).message);
      }
    }
    load();
  }, []);

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

  const actions = [
    { label: "Brand baselines", detail: "Manage official product truth.", href: "/brands", icon: Building2 },
    { label: "Discover candidates", detail: "Find leads without treating search as proof.", href: "/discovery", icon: Search },
    { label: "Add listing", detail: "Create a manual evidence record.", href: "/listings/new", icon: Plus },
    { label: "Import listings", detail: "Paste JSON records for batch intake.", href: "/listings/import", icon: FileInput },
    { label: "Review queue", detail: "Apply internal human labels.", href: "/review", icon: ClipboardCheck },
    { label: "Evaluation", detail: "Inspect pilot metrics and review burden.", href: "/evaluation", icon: BarChart3 },
  ];

  if (error) {
    return <div className="p-6 text-destructive">Error: {error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
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
              <PlayCircle className="h-4 w-4" />
              Run demo again
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {nextActions.map(({ label, detail, href, icon: Icon }) => (
              <Link key={label} href={href} className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-muted">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {ambientStatus && ambientStatus.items.length > 0 && (
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
                {ambientStatus.items.slice(0, 3).map((item) => (
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
                  <Shield className="h-3.5 w-3.5" />
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
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/demo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <PlayCircle className="h-4 w-4" />
                Run Guided Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="surface-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
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
              <button
                onClick={seedDemoData}
                disabled={seeding}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
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
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </Link>
          ))}
        </section>
      )}

      {hasData && (
        <section className="surface-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">After the demo</h2>
              <p className="text-sm text-muted-foreground">Use these paths for real review work once the core workflow makes sense.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actions.map(({ label, detail, href, icon: Icon }) => (
              <Link key={label} href={href} className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon className="h-4 w-4" />
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

      <details className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Local demo command</summary>
        <p className="mt-2 text-sm text-muted-foreground">Use this only when starting the app from a terminal.</p>
        <code className="mt-3 block rounded-md bg-background px-3 py-2 text-sm">npm run dev -- -p 3015</code>
      </details>
    </div>
  );
}

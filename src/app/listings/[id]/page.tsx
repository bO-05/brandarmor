"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  ClipboardCheck,
  Eye,
  Gauge,
  Loader2,
  ScanText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { BaselineExplainer } from "@/components/BaselineExplainer";
import { DemoWorkflowTrail } from "@/components/DemoWorkflowTrail";
import { ListingMediaPanel } from "@/components/ListingMediaPanel";
import { ReviewDecisionPanel } from "@/components/ReviewDecisionPanel";
import { TermHelp } from "@/components/TermHelp";
import type {
  Evidence,
  Listing,
  LlmJudgeAssessment,
  OcrArtifact,
  Product,
  RegulatoryCheck,
  ReviewDecision,
  Score,
  VisualMatchEvidence,
} from "@/domain/types";
import { buildListingCaseBrief, buildListingWorkflow, buildMediaPreview, getListingNextAction, getListingPrimaryAction, getListingSourceTypeLabel, getPilotLabelPresentation, getRecommendedActionPresentation, getReviewStatusPresentation, type ListingWorkflowStepId, type OperationState } from "@/lib/ui-ux";
import { formatCurrency, getScoreColor } from "@/lib/utils";

type StepResponse<T = unknown> = T & { error?: string; artifact?: { error?: string } | null; judge?: { error?: string } | null };

function stateTone(state: OperationState): string {
  switch (state) {
    case "completed": return "border-success/30 bg-success/10 text-success";
    case "running": return "border-warning/40 bg-warning/10 text-warning";
    case "failed": return "border-destructive/30 bg-destructive/10 text-destructive";
    case "skipped": return "border-border bg-muted text-muted-foreground";
    default: return "border-border bg-background text-muted-foreground";
  }
}

function briefStatusTone(tone: "neutral" | "warning" | "success" | "danger"): string {
  switch (tone) {
    case "success": return "border-success/30 bg-success/10 text-success";
    case "danger": return "border-destructive/30 bg-destructive/10 text-destructive";
    case "warning": return "border-warning/40 bg-warning/10 text-warning";
    default: return "border-border bg-muted text-muted-foreground";
  }
}

function StateIcon({ state }: { state: OperationState }) {
  if (state === "completed") return <CheckCircle2 className="h-4 w-4" />;
  if (state === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (state === "failed") return <XCircle className="h-4 w-4" />;
  return <CircleDashed className="h-4 w-4" />;
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [ocr, setOcr] = useState<OcrArtifact[]>([]);
  const [regulatory, setRegulatory] = useState<RegulatoryCheck[]>([]);
  const [visual, setVisual] = useState<VisualMatchEvidence[]>([]);
  const [judge, setJudge] = useState<LlmJudgeAssessment[]>([]);
  const [review, setReview] = useState<ReviewDecision | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [linkingProductId, setLinkingProductId] = useState("");
  const [linkingBaseline, setLinkingBaseline] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningStep, setRunningStep] = useState<ListingWorkflowStepId | null>(null);
  const [failedStep, setFailedStep] = useState<ListingWorkflowStepId | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [listings, scores, evidenceRes, ocrRes, regRes, visualRes, judgeRes, reviewRes, productsRes] = await Promise.all([
      fetch("/api/listings").then((r) => r.json()),
      fetch("/api/scoring").then((r) => r.json()),
      fetch(`/api/evidence?listingId=${params.id}`).then((r) => r.json()),
      fetch(`/api/ocr?listingId=${params.id}`).then((r) => r.json()),
      fetch(`/api/regulatory/check?listingId=${params.id}`).then((r) => r.json()),
      fetch(`/api/visual/compare?listingId=${params.id}`).then((r) => r.json()),
      fetch(`/api/judge?listingId=${params.id}`).then((r) => r.json()),
      fetch(`/api/review?listingId=${params.id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/products").then((r) => r.json()),
    ]);
    const found = Array.isArray(listings) ? listings.find((l: Listing) => l.id === params.id) : null;
    setListing(found ?? null);
    const foundScore = Array.isArray(scores) ? scores.find((s: Score) => s.listingId === params.id) : null;
    setScore(foundScore ?? null);
    setEvidence(Array.isArray(evidenceRes) ? evidenceRes : []);
    setOcr(Array.isArray(ocrRes) ? ocrRes : []);
    setRegulatory(Array.isArray(regRes) ? regRes : []);
    setVisual(Array.isArray(visualRes) ? visualRes : []);
    setJudge(Array.isArray(judgeRes) ? judgeRes : []);
    setReview(reviewRes ?? null);
    setProducts(Array.isArray(productsRes) ? productsRes : []);
    if (found && !imageUrl) setImageUrl(found.screenshotUrl ?? found.imageUrls?.[0] ?? "");
  }

  useEffect(() => { load().catch((e) => setMessage((e as Error).message)); }, [params.id]);
  useEffect(() => {
    if (!linkingProductId && products.length > 0) setLinkingProductId(products[0].id);
  }, [linkingProductId, products]);

  const workflow = useMemo(() => buildListingWorkflow({
    hasProductBaseline: Boolean(listing?.productId),
    hasOcr: Boolean(ocr[0]?.status === "completed"),
    hasRegulatory: regulatory.length > 0,
    hasVisual: visual.length > 0,
    hasScore: Boolean(score),
    hasJudge: judge.length > 0,
    reviewStatus: review?.status ?? null,
    runningStep,
    failedStep,
  }), [failedStep, judge.length, listing?.productId, ocr, regulatory.length, review?.status, runningStep, score, visual.length]);

  const linkedProduct = useMemo(() => products.find((product) => product.id === listing?.productId) ?? null, [listing?.productId, products]);
  const selectedBaseline = useMemo(() => products.find((product) => product.id === linkingProductId) ?? null, [linkingProductId, products]);
  const mediaPreview = useMemo(() => buildMediaPreview({
    screenshotUrl: listing?.screenshotUrl ?? null,
    imageUrls: listing?.imageUrls ?? [],
    listingLimitations: listing?.limitations ?? [],
    sourceConfidence: listing?.sourceConfidence ?? 0,
    visualStatus: visual[0]?.status ?? null,
    visualProvider: visual[0]?.provider ?? null,
    productOfficialImageUrls: linkedProduct?.officialImageUrls ?? [],
    referenceImageNotes: linkedProduct?.referenceImageNotes ?? null,
  }), [linkedProduct?.officialImageUrls, linkedProduct?.referenceImageNotes, listing?.imageUrls, listing?.limitations, listing?.screenshotUrl, listing?.sourceConfidence, visual]);
  const caseBrief = useMemo(() => buildListingCaseBrief({
    hasProductBaseline: Boolean(listing?.productId),
    score,
    evidenceCount: evidence.length,
    regulatoryStatus: regulatory[0]?.status ?? null,
    visualStatus: visual[0]?.status ?? null,
    judge: judge[0] ?? null,
  }), [evidence.length, judge, listing?.productId, regulatory, score, visual]);
  const primaryAction = useMemo(() => getListingPrimaryAction({
    hasProductBaseline: Boolean(listing?.productId),
    loading,
  }), [listing?.productId, loading]);
  const nextAction = useMemo(() => getListingNextAction({
    hasProductBaseline: Boolean(listing?.productId),
    loading,
    score,
    reviewStatus: review?.status ?? null,
    judge: judge[0] ?? null,
    missingEvidenceCount: caseBrief.missingEvidence.length,
  }), [caseBrief.missingEvidence.length, judge, listing?.productId, loading, review?.status, score]);

  async function postStep<T>(step: ListingWorkflowStepId, url: string, body: unknown): Promise<StepResponse<T>> {
    setRunningStep(step);
    setFailedStep(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? json.artifact?.error ?? json.judge?.error ?? `${step} failed`);
    return json;
  }

  async function runRecommendedPipeline() {
    setLoading(true);
    setMessage(null);
    let active: ListingWorkflowStepId | null = null;
    try {
      if (!listing?.productId) {
        throw new Error("Link a product baseline before running the guided evidence pipeline.");
      }
      if (imageUrl) {
        active = "ocr";
        await postStep("ocr", "/api/ocr", { listingId: params.id, imageUrl, forceMock: false });
      }
      active = "regulatory";
      await postStep("regulatory", "/api/regulatory/check", { listingId: params.id });
      active = "visual";
      await postStep("visual", "/api/visual/compare", { listingId: params.id, suspectImageUrl: imageUrl || null });
      active = "score";
      const scoreJson = await postStep<Score>("score", "/api/scoring", { listingId: params.id });
      active = "judge";
      await postStep("judge", "/api/judge", { listingId: params.id, forceMock: false });
      if (scoreJson.id && scoreJson.recommendedAction !== "ignore") {
        active = "review";
        await postStep("review", "/api/review", { listingId: params.id, scoreId: scoreJson.id, status: "pending" });
      }
      setMessage("Recommended pipeline completed. Evidence is ready for internal review.");
      await load();
    } catch (e) {
      setFailedStep(active);
      setMessage((e as Error).message);
    } finally {
      setRunningStep(null);
      setLoading(false);
    }
  }

  async function linkProductBaseline() {
    if (!linkingProductId) {
      setMessage("Choose a product baseline before linking this listing.");
      return;
    }
    setLinkingBaseline(true);
    setMessage(null);
    try {
      const res = await fetch("/api/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: params.id, productId: linkingProductId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to link product baseline");
      setMessage("Product baseline linked. You can now run the recommended pipeline.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLinkingBaseline(false);
    }
  }

  async function runSingleStep(step: ListingWorkflowStepId, action: () => Promise<unknown>, success: string) {
    setLoading(true);
    setMessage(null);
    setRunningStep(step);
    setFailedStep(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (e) {
      setFailedStep(step);
      setMessage((e as Error).message);
    } finally {
      setRunningStep(null);
      setLoading(false);
    }
  }

  async function runOcr(forceMock = false) {
    await runSingleStep("ocr", async () => {
      if (!imageUrl) throw new Error("OCR needs an image or screenshot URL.");
      await postStep("ocr", "/api/ocr", { listingId: params.id, imageUrl, forceMock });
    }, forceMock ? "Demo OCR completed." : "OCR completed.");
  }

  async function runRegulatory() {
    await runSingleStep("regulatory", async () => {
      await postStep("regulatory", "/api/regulatory/check", { listingId: params.id });
    }, "BPOM/NIE evidence refreshed.");
  }

  async function runVisual() {
    await runSingleStep("visual", async () => {
      await postStep("visual", "/api/visual/compare", { listingId: params.id, suspectImageUrl: imageUrl || null });
    }, "Visual evidence refreshed.");
  }

  async function runScore() {
    await runSingleStep("score", async () => {
      await postStep("score", "/api/scoring", { listingId: params.id });
    }, "Routing score recomputed.");
  }

  async function runJudge(forceMock = false) {
    await runSingleStep("judge", async () => {
      await postStep("judge", "/api/judge", { listingId: params.id, forceMock });
    }, forceMock ? "Mock judge assessment completed." : "Claude/Mistral judge assessment completed.");
  }

  if (!listing) return <div className="p-6"><Link href="/listings" className="text-primary">Back</Link><p className="mt-4">Listing not found.</p></div>;

  return (
    <div className="mx-auto max-w-6xl">
      <DemoWorkflowTrail />
      <Link href="/listings" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Listings</Link>

      <section className="surface-card mb-5 rounded-lg border-l-4 border-l-primary p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Next action</p>
            <h1 className="mt-1 text-2xl font-bold">{nextAction.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{nextAction.detail}</p>
          </div>
          {nextAction.kind === "run_pipeline" || nextAction.kind === "link_baseline" ? (
            <button
              onClick={nextAction.kind === "run_pipeline" ? runRecommendedPipeline : undefined}
              disabled={nextAction.kind === "link_baseline" || primaryAction.disabled}
              className="inline-flex min-h-10 min-w-56 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {nextAction.primaryLabel}
            </button>
          ) : nextAction.kind === "review" ? (
            <a href="#review-decision" className="inline-flex min-h-10 min-w-44 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <ClipboardCheck className="h-4 w-4" />
              {nextAction.primaryLabel}
            </a>
          ) : (
            <a href="#full-evidence-workspace" className="inline-flex min-h-10 min-w-44 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
              {nextAction.primaryLabel}
            </a>
          )}
        </div>
      </section>

      <section className="mb-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="surface-card rounded-lg p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Case brief</p>
          <h2 className="mt-1 text-xl font-bold">{caseBrief.headline}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{caseBrief.summary}</p>
          <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
            <b>Next step</b>
            <p className="mt-1 text-muted-foreground">{caseBrief.recommendedNextStep}</p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {caseBrief.evidenceStatus.map((status) => (
              <div key={status.label} className={`rounded-md border px-3 py-2 text-sm ${briefStatusTone(status.tone)}`}>
                <p className="font-semibold">{status.label}</p>
                <p className="mt-1 text-xs opacity-85">{status.value}</p>
              </div>
            ))}
          </div>

          {(caseBrief.topReasons.length > 0 || caseBrief.missingEvidence.length > 0) && (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {caseBrief.topReasons.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <h3 className="text-sm font-semibold">Why it was routed</h3>
                  <div className="mt-2 grid gap-2">
                    {caseBrief.topReasons.map((reason) => (
                      <div key={`${reason.title}-${reason.points}`} className="rounded-md bg-muted p-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <b>{reason.title}</b>
                          <span className="shrink-0 text-xs text-muted-foreground">{reason.points} pts</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{reason.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {caseBrief.missingEvidence.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <h3 className="text-sm font-semibold">Evidence still missing</h3>
                  <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    {caseBrief.missingEvidence.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <ListingMediaPanel preview={mediaPreview} />
      </section>

      {review && (
        <ReviewDecisionPanel
          id="review-decision"
          className="mb-5"
          listingId={listing.id}
          decision={review}
          score={score}
          title={listing.title}
          onSaved={async (status) => {
            toast.success(`Review label saved: ${getReviewStatusPresentation(status).label}`);
            setMessage("Internal review label saved. No external report or enforcement action was triggered.");
            await load();
          }}
        />
      )}

      <section className="surface-card mb-5 rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Required action</p>
            <h2 className="mt-1 text-lg font-bold">{listing.productId ? "Run the evidence path" : "Link official product truth first"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{primaryAction.reason}</p>
          </div>
          <button
            onClick={runRecommendedPipeline}
            disabled={primaryAction.disabled}
            className="inline-flex min-h-10 min-w-56 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {primaryAction.label}
          </button>
        </div>

        {!listing.productId && (
          <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3">
            <BaselineExplainer className="mb-4" />
            <label className="mb-2 block text-sm font-semibold">Product baseline</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={linkingProductId}
                onChange={(event) => setLinkingProductId(event.target.value)}
                className="min-h-10 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {products.length === 0 ? (
                  <option value="">No products available</option>
                ) : products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.bpomNie ? ` / ${product.bpomNie}` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={linkProductBaseline}
                disabled={linkingBaseline || !linkingProductId}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {linkingBaseline ? "Linking..." : "Link baseline"}
              </button>
            </div>
            {products.length === 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/demo" className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Run guided demo</Link>
                <Link href="/brands" className="rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">Create baseline</Link>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">This only attaches official product truth for evidence review; it does not change the source listing.</p>
            {selectedBaseline && (
              <div className="mt-3 grid gap-2 rounded-md border border-border bg-background p-3 text-sm md:grid-cols-4">
                <div>
                  <span className="text-xs text-muted-foreground">Product</span>
                  <p className="font-semibold">{selectedBaseline.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">BPOM/NIE</span>
                  <p>{selectedBaseline.bpomNie ?? "not recorded"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Expected price</span>
                  <p>{selectedBaseline.msrp ? formatCurrency(selectedBaseline.msrp, selectedBaseline.msrpCurrency) : "not recorded"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Authorized sellers</span>
                  <p>{selectedBaseline.authorizedSellers.length ? selectedBaseline.authorizedSellers.slice(0, 2).join(", ") : "not recorded"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {listing.productId && linkedProduct && (
          <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
            <b>Baseline linked:</b> {linkedProduct.name}
            <p className="mt-1 text-muted-foreground">
              This official product truth is used only as comparison context for evidence review.
            </p>
          </div>
        )}

        {message && (
          <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${failedStep ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground"}`}>
            {message}
          </div>
        )}
      </section>

      <details id="full-evidence-workspace" className="surface-card rounded-lg p-5">
        <summary className="cursor-pointer text-lg font-semibold">View full evidence workspace</summary>
        <p className="mt-1 text-sm text-muted-foreground">
          Open this for workflow progress, listing metadata, technical score details, provider reruns, and stored evidence records.
        </p>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card rounded-lg p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Evidence progress</p>
              <h1 className="mt-1 text-xl font-bold">{listing.title ?? "Untitled listing"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Workflow status stays compact; detailed evidence and provider reruns are lower on the page.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {workflow.map((step) => (
              <div key={step.id} className={`rounded-md border p-3 ${stateTone(step.state)}`}>
                <div className="flex items-center gap-2">
                  <StateIcon state={step.state} />
                  <span className="text-sm font-semibold">{step.title}</span>
                  <span className="ml-auto text-xs uppercase">{step.state}</span>
                </div>
                <p className="mt-1 text-xs opacity-85">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-lg p-5">
          <h2 className="mb-3 font-semibold">Listing summary</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Product baseline</span><p>{linkedProduct?.name ?? "Not linked"}</p></div>
            <div><span className="text-muted-foreground">Seller</span><p>{listing.sellerName ?? "Unknown"}</p></div>
            <div><span className="text-muted-foreground">Price</span><p>{formatCurrency(listing.price, listing.currency)}</p></div>
            <div>
              <span className="text-muted-foreground">Source</span>
              <p>{getListingSourceTypeLabel(listing.sourceType)}</p>
            </div>
            <div>
              <span className="text-muted-foreground"><TermHelp term="source_confidence" /></span>
              <p>{Math.round(listing.sourceConfidence * 100)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground"><TermHelp term="pilot_label" /></span>
              <p>{getPilotLabelPresentation(listing.groundTruth)}</p>
            </div>
          </div>
          {listing.listingUrl && <a href={listing.listingUrl} target="_blank" className="mt-4 block break-all text-sm text-primary">{listing.listingUrl}</a>}
          {listing.limitations.length > 0 && <p className="mt-4 text-sm text-muted-foreground">Limitations: {listing.limitations.join(", ")}</p>}
        </div>
      </section>

      <details className="mt-5 rounded-lg border border-border bg-background p-5">
        <summary className="cursor-pointer font-semibold">Technical score and evidence details</summary>
        <p className="mt-1 text-sm text-muted-foreground">Open this when tuning thresholds, checking provider output, or auditing cited evidence.</p>
        <section className="mt-4 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Gauge className="h-4 w-4 text-primary" /> <TermHelp term="routing_score" /></h2>
          {score ? (
            <div>
              <span className={`inline-flex rounded-md px-3 py-1 text-sm font-semibold ${getScoreColor(score.totalScore)}`}>Score {score.totalScore}</span>
              <p className="mt-2 text-sm text-muted-foreground">{score.riskLevel} | {getRecommendedActionPresentation(score.recommendedAction).label} | <TermHelp term="confidence_band" />: {score.confidenceBand}</p>
              <p className="mt-1 text-xs text-muted-foreground">{getRecommendedActionPresentation(score.recommendedAction).helpText}</p>
              <details className="mt-4 rounded-md border border-border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold">Show score reasons</summary>
                <div className="mt-3 space-y-2">
                  {score.reasons.map((r) => (
                    <div key={r.ruleId} className="rounded-md bg-muted p-2 text-sm">
                      <b>{r.ruleName}</b>
                      <p>{r.message}</p>
                      <p className="text-xs text-muted-foreground">{r.points} pts | evidence refs {r.evidenceRefs.length}</p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : <p className="text-sm text-muted-foreground">No score yet. Run the recommended pipeline after linking a product baseline.</p>}
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" /> Evidence status</h2>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <b><TermHelp term="bpom_nie" /> Check</b>
              <p className="mt-1 text-muted-foreground">{regulatory[0]?.status ?? "not run"}</p>
              {regulatory[0]?.sourceUrl && <a href={regulatory[0].sourceUrl} target="_blank" className="mt-1 block break-all text-primary">BPOM linkout</a>}
            </div>
            <div className="rounded-md border border-border p-3">
              <b><TermHelp term="visual_comparison" /></b>
              <p className="mt-1 text-muted-foreground">{visual[0]?.status ?? "not run"} {visual[0]?.similarityScore == null ? "" : `(${Math.round(visual[0].similarityScore * 100)}%)`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{visual[0]?.evidenceSummary ?? "Adapter/mock visual evidence; no production image retrieval claim."}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <b>Evidence Judge</b>
              <p className="mt-1 text-muted-foreground">{judge[0]?.judgeRisk ?? "not run"} | {judge[0]?.confidence ?? "n/a"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{judge[0]?.recommendedNextAction ?? "Judge must cite evidence or return insufficient evidence."}</p>
            </div>
          </div>
          {judge[0] && (
            <details className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Show judge reasons</summary>
              <ul className="mt-2 list-disc pl-5">
                {judge[0].supportedReasons.map((r) => <li key={r}>{r}</li>)}
                {judge[0].missingEvidence.map((r) => <li key={r}>Missing: {r}</li>)}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Cited evidence IDs: {judge[0].citedEvidenceIds.length ? judge[0].citedEvidenceIds.join(", ") : "none"}</p>
            </details>
          )}
        </div>
        </section>
      </details>

      <section className="mt-5 rounded-lg border border-border bg-background p-5">
        <button
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block font-semibold">Advanced evidence steps</span>
            <span className="text-sm text-muted-foreground">Use these when rerunning one provider or debugging a partial case.</span>
          </span>
          {advancedOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Image or screenshot URL</label>
              <div className="flex flex-col gap-2 md:flex-row">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image or screenshot URL" className="min-h-10 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <button onClick={() => runOcr(false)} disabled={loading || !imageUrl} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
                  <ScanText className="h-4 w-4" /> Run OCR
                </button>
                <button onClick={() => runOcr(true)} disabled={loading} className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-60">Demo OCR</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={runRegulatory} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-60">
                <ShieldCheck className="h-4 w-4" /> Run BPOM/NIE
              </button>
              <button onClick={runVisual} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-60">
                <Eye className="h-4 w-4" /> Run Visual
              </button>
              <button onClick={runScore} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-60">
                <Gauge className="h-4 w-4" /> Recompute Score
              </button>
              <button onClick={() => runJudge(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
                <Bot className="h-4 w-4" /> Run Judge
              </button>
              <button onClick={() => runJudge(true)} disabled={loading} className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-60">Mock Judge</button>
            </div>
            {ocr[0] && <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{ocr[0].markdown || ocr[0].error}</pre>}
            {ocr[0]?.parsedFields && (
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <div className="rounded-md bg-muted p-2"><b>BPOM/NIE</b><p>{ocr[0].parsedFields.bpomNie ?? "not found"}</p></div>
                <div className="rounded-md bg-muted p-2"><b>Size</b><p>{ocr[0].parsedFields.volumeOrSize ?? "not found"}</p></div>
                <div className="rounded-md bg-muted p-2"><b>Expiry</b><p>{ocr[0].parsedFields.expiryDate ?? "not found"}</p></div>
                <div className="rounded-md bg-muted p-2"><b>Batch</b><p>{ocr[0].parsedFields.batchOrLot ?? "not found"}</p></div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-background p-5">
        <details>
          <summary className="cursor-pointer font-semibold">Stored evidence records</summary>
        {evidence.length === 0 ? (
          <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">No stored evidence yet. Run the recommended pipeline to create OCR, regulatory, visual, score, and judge evidence records.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {evidence.map((e) => (
              <div key={e.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex justify-between gap-3"><b>{e.fieldName}</b><span className="text-xs text-muted-foreground">{e.evidenceType} | {e.confidence == null ? "n/a" : Math.round(e.confidence * 100) + "%"}</span></div>
                <p className="mt-1 break-words text-muted-foreground">{e.extractedValue.slice(0, 500)}</p>
              </div>
            ))}
          </div>
        )}
        </details>
      </section>
      </details>
    </div>
  );
}

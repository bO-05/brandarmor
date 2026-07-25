import { NextResponse, type NextRequest } from "next/server";
import { buildCaseReport } from "@/lib/case-report";
import { getPilotReportForListing } from "@/db/investigations-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import {
  getEvidence,
  getLatestLlmJudgeAssessment,
  getLatestOcrArtifact,
  getLatestRegulatoryCheck,
  getLatestVisualMatch,
  getListing,
  getProduct,
  getReviewDecision,
  getScore,
} from "@/persistence/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

function filenameFor(listingId: string, format: "json" | "pdf"): string {
  const safeId = listingId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `brandarmor-evidence-report-${safeId}.${format}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: listingId } = await context.params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";

  if (format !== "json" && format !== "pdf") {
    return NextResponse.json({ error: "format must be json or pdf" }, { status: 400 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (access.actor?.workspaceId) {
    const report = await getPilotReportForListing(access.actor.workspaceId, listingId);
    if (!report) return NextResponse.json({ error: "Durable report not found. Run the investigation first." }, { status: 404 });
    if (format === "pdf") {
      return NextResponse.json({ error: "PDF export is not available for the durable pilot report yet. Download JSON evidence report instead." }, { status: 501 });
    }
    return NextResponse.json(report.reportJson, {
      headers: {
        "Content-Disposition": `attachment; filename="${filenameFor(listingId, "json")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  ensureDemoSeeded();
  const listing = getListing(listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const bundle = {
    listing,
    product: listing.productId ? getProduct(listing.productId) ?? null : null,
    evidence: getEvidence(listing.id),
    ocr: getLatestOcrArtifact(listing.id) ?? null,
    regulatory: getLatestRegulatoryCheck(listing.id) ?? null,
    visual: getLatestVisualMatch(listing.id) ?? null,
    score: getScore(listing.id) ?? null,
    judge: getLatestLlmJudgeAssessment(listing.id) ?? null,
    review: getReviewDecision(listing.id) ?? null,
  };
  const report = buildCaseReport(bundle);

  if (format === "json") {
    return NextResponse.json(report, {
      headers: {
        "Content-Disposition": `attachment; filename="${filenameFor(listing.id, "json")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const { renderCaseReportPdf } = await import("@/lib/case-report-pdf");
  const pdf = await renderCaseReportPdf(report);
  const body = new Uint8Array(pdf);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameFor(listing.id, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
}

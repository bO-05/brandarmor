import { NextResponse } from "next/server";
import { buildCaseReport } from "@/lib/case-report";
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

export async function GET(request: Request, context: RouteContext) {
  const { id: listingId } = await context.params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";

  if (format !== "json" && format !== "pdf") {
    return NextResponse.json({ error: "format must be json or pdf" }, { status: 400 });
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

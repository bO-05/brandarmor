import { NextResponse } from "next/server";
import { getReviewDecisions, getReviewDecision, createReviewDecision, updateReviewDecision } from "@/persistence/store";
import { insertReviewDecisionSchema } from "@/domain/schemas";
import { isValidTransition, getAllowedTransitions } from "@/domain/review";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    if (listingId) {
      const decision = getReviewDecision(listingId);
      if (!decision) return NextResponse.json({ error: "Review decision not found" }, { status: 404 });
      return NextResponse.json(decision);
    }
    const decisions = getReviewDecisions();
    return NextResponse.json(decisions);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertReviewDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const decision = createReviewDecision(parsed.data);
    return NextResponse.json(decision, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { listingId, status, reviewer, notes } = body;
    if (!listingId || !status) {
      return NextResponse.json({ error: "listingId and status are required" }, { status: 400 });
    }
    const existing = getReviewDecision(listingId);
    if (!existing) return NextResponse.json({ error: "Review decision not found" }, { status: 404 });
    if (!isValidTransition(existing.status, status)) {
      return NextResponse.json({
        error: `Invalid transition from ${existing.status} to ${status}`,
        allowed: getAllowedTransitions(existing.status),
      }, { status: 400 });
    }
    const updated = updateReviewDecision(listingId, status, reviewer, notes);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

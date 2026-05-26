import { NextResponse } from "next/server";
import { getEvidence, createEvidence, getListing } from "@/persistence/store";
import { insertEvidenceSchema } from "@/domain/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const evidence = getEvidence(listingId ?? undefined);
    return NextResponse.json(evidence);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const listing = getListing(parsed.data.listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 400 });
    }
    const evidence = createEvidence(parsed.data);
    return NextResponse.json(evidence, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
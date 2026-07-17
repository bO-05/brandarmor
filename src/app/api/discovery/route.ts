import { NextResponse } from "next/server";
import { discoverCandidates } from "@/lib/search-discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  try {
    const candidates = await discoverCandidates(query);
    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json({ error: "Candidate discovery could not complete. Retry the query; any demo results are labeled as such." }, { status: 500 });
  }
}

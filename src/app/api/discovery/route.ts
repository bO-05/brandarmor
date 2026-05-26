import { NextResponse } from "next/server";
import { discoverCandidates } from "@/lib/search-discovery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query ?? "").trim();
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
    const candidates = await discoverCandidates(query);
    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

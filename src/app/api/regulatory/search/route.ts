import { NextResponse } from "next/server";

import { queryBpomCosmetics } from "@/lib/bpom-verify";

export const dynamic = "force-dynamic";

function normalizeLength(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(parsed, 25));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand")?.trim() || null;
  const nie = searchParams.get("nie")?.trim() || null;
  const productName = searchParams.get("productName")?.trim() || null;
  const length = normalizeLength(searchParams.get("length"));

  if (!brand && !nie && !productName) {
    return NextResponse.json({
      source: "bpom_api",
      error: "BPOM search requires at least one of brand, nie, or productName.",
      query: { brand, nie, productName, length },
    }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const result = await queryBpomCosmetics({ brand, nie, productName, length });
  return NextResponse.json({
    source: "bpom_api",
    query: { brand, nie, productName, length },
    ...result,
  }, {
    status: result.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}

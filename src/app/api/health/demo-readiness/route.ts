import { NextResponse } from "next/server";
import { hasEnvValue } from "@/lib/env";
import { getBrands, getListings, getProducts, isDataDirWritable } from "@/persistence/store";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { isControlledDemoMode } from "@/lib/runtime-mode";

export async function GET() {
  try {
    ensureDemoSeeded();
    const brandCount = getBrands().length;
    const productCount = getProducts().length;
    const listingCount = getListings().length;
    const dataWritable = isDataDirWritable();
    return NextResponse.json({
      mistralConfigured: hasEnvValue("MISTRAL_API_KEY"),
      anthropicConfigured: hasEnvValue("ANTHROPIC_API_KEY"),
      dataWritable,
      brandCount,
      productCount,
      listingCount,
      runtimeMode: isControlledDemoMode() ? "controlled_demo" : "interactive",
      mutationsEnabled: !isControlledDemoMode(),
      demoReady: dataWritable && brandCount > 0 && productCount > 0 && listingCount > 0,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

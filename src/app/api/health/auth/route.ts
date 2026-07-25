import { NextResponse } from "next/server";

import { isClerkConfigured, isPilotRuntime } from "@/lib/auth/config";
import { isControlledDemoMode } from "@/lib/runtime-mode";
import { isInngestConfigured } from "@/lib/inngest";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    runtimeMode: isControlledDemoMode() ? "controlled_demo" : isPilotRuntime() ? "pilot" : "interactive",
    clerkPublishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    clerkSecretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    clerkServerConfigured: isClerkConfigured(),
    privateBlobConfigured: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN),
    inngestConfigured: isInngestConfigured(),
  }, { headers: { "Cache-Control": "no-store" } });
}

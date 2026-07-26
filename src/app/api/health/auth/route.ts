import { NextResponse, type NextRequest } from "next/server";

import { isClerkConfigured, isPilotRuntime } from "@/lib/auth/config";
import { isControlledDemoMode } from "@/lib/runtime-mode";
import { isInngestConfigured } from "@/lib/inngest";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const runtimeMode = isControlledDemoMode() ? "controlled_demo" : isPilotRuntime() ? "pilot" : "interactive";
  if (!isPilotRuntime()) {
    return NextResponse.json({ status: "ok", runtimeMode }, { headers: { "Cache-Control": "no-store" } });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  return NextResponse.json({
    status: "ok",
    runtimeMode,
    clerkPublishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    clerkSecretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    clerkServerConfigured: isClerkConfigured(),
    privateBlobConfigured: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN),
    inngestConfigured: isInngestConfigured(),
  }, { headers: { "Cache-Control": "no-store" } });
}

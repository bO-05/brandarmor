import { NextResponse } from "next/server";

import { isClerkConfigured, isPilotRuntime } from "@/lib/auth/config";
import { isControlledDemoMode } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    runtimeMode: isControlledDemoMode() ? "controlled_demo" : isPilotRuntime() ? "pilot" : "interactive",
    clerkPublishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    clerkSecretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    clerkServerConfigured: isClerkConfigured(),
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse, type NextRequest } from "next/server";
import { discoverCandidates } from "@/lib/search-discovery";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }
  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  try {
    if (access.actor?.workspaceId && access.actor.userId) {
      await enforcePilotRateLimit({
        workspaceId: access.actor.workspaceId,
        userId: access.actor.userId,
        scope: "discovery.search",
        limit: 10,
        windowSeconds: 60 * 60,
      });
    }
    const candidates = await discoverCandidates(query);
    return NextResponse.json({
      candidates,
      notice: candidates.length ? null : "Verified marketplace discovery is not configured or did not return qualifying listing URLs.",
    });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: "Candidate discovery could not complete. Retry after confirming provider configuration." }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getProducts, createProduct } from "@/persistence/store";
import { insertProductSchema } from "@/domain/schemas";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { requirePilotAdminActor, requirePilotWriteActor } from "@/lib/auth/route-guard";
import { createPilotProductBaseline, listPilotProductBaselines } from "@/db/product-baselines-repository";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateBrandId = searchParams.get("brandId");
    const brandId = candidateBrandId && candidateBrandId !== "undefined" && candidateBrandId !== "null" ? candidateBrandId : null;
    const access = await requirePilotWriteActor(request);
    if (!access.allowed) return access.response;
    if (access.actor?.workspaceId) {
      return NextResponse.json(await listPilotProductBaselines(access.actor.workspaceId, brandId));
    }

    ensureDemoSeeded();
    return NextResponse.json(getProducts(brandId ?? undefined));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotAdminActor(request);
  if (!access.allowed) return access.response;

  try {
    if (access.actor?.workspaceId && access.actor.userId) {
      await enforcePilotRateLimit({ workspaceId: access.actor.workspaceId, userId: access.actor.userId, scope: "baseline.write", limit: 30, windowSeconds: 60 * 60 });
    }
    const body = await request.json();
    const parsed = insertProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    if (access.actor?.workspaceId) {
      return NextResponse.json(await createPilotProductBaseline(access.actor.workspaceId, parsed.data), { status: 201 });
    }

    return NextResponse.json(createProduct(parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof PilotRateLimitError) {
      return NextResponse.json({ error: e.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

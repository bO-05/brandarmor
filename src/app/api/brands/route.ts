import { NextResponse, type NextRequest } from "next/server";
import { getBrands, createBrand } from "@/persistence/store";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { insertBrandSchema } from "@/domain/schemas";
import { requirePilotAdminActor, requirePilotWriteActor } from "@/lib/auth/route-guard";
import { createPilotBrand, listPilotBrands } from "@/db/brands-repository";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePilotWriteActor(request);
    if (!access.allowed) return access.response;
    if (access.actor?.workspaceId) {
      return NextResponse.json(await listPilotBrands(access.actor.workspaceId));
    }

    ensureDemoSeeded();
    return NextResponse.json(getBrands());
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
      await enforcePilotRateLimit({ workspaceId: access.actor.workspaceId, userId: access.actor.userId, scope: "brand.write", limit: 30, windowSeconds: 60 * 60 });
    }
    const body = await request.json();
    const parsed = insertBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    if (access.actor?.workspaceId) {
      return NextResponse.json(await createPilotBrand(access.actor.workspaceId, parsed.data), { status: 201 });
    }

    return NextResponse.json(createBrand(parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof PilotRateLimitError) {
      return NextResponse.json({ error: e.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    console.error("BrandArmor brand creation failed", e);
    return NextResponse.json({ error: "Could not create the brand. Retry.", code: "brand_create_failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getProducts, createProduct } from "@/persistence/store";
import { insertProductSchema } from "@/domain/schemas";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { requirePilotAdminActor, requirePilotWriteActor } from "@/lib/auth/route-guard";
import { createPilotProductBaseline, listPilotProductBaselines } from "@/db/product-baselines-repository";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const access = await requirePilotWriteActor();
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

export async function POST(request: Request) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotAdminActor();
  if (!access.allowed) return access.response;

  try {
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
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

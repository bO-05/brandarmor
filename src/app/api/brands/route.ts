import { NextResponse } from "next/server";
import { getBrands, createBrand, seedDemoData } from "@/persistence/store";
import { insertBrandSchema } from "@/domain/schemas";
import { requirePilotAdminActor, requirePilotWriteActor } from "@/lib/auth/route-guard";
import { createPilotBrand, listPilotBrands } from "@/db/brands-repository";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";

export async function GET() {
  try {
    const access = await requirePilotWriteActor();
    if (!access.allowed) return access.response;
    if (access.actor?.workspaceId) {
      return NextResponse.json(await listPilotBrands(access.actor.workspaceId));
    }

    return NextResponse.json(getBrands());
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
    const parsed = insertBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    if (access.actor?.workspaceId) {
      return NextResponse.json(await createPilotBrand(access.actor.workspaceId, parsed.data), { status: 201 });
    }

    return NextResponse.json(createBrand(parsed.data), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

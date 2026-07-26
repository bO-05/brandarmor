import { createHash, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { del, put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { listPilotCaseAssets } from "@/db/case-assets-repository";
import { getDatabase } from "@/db";
import { auditEvents, caseAssets } from "@/db/schema";
import { getPilotListing } from "@/db/listings-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }

  const { id: listingId } = await context.params;
  const listing = await getPilotListing(access.actor.workspaceId, listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const assets = await listPilotCaseAssets(access.actor.workspaceId, listingId);
  return NextResponse.json(assets.filter((asset) => !asset.deletedAt).map((asset) => ({
    id: asset.id,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    provenance: asset.provenance,
    retentionUntil: asset.retentionUntil?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
    viewUrl: `/api/assets/${asset.id}`,
  })), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (isControlledDemoMode()) {
    return NextResponse.json(controlledDemoReadOnlyPayload(), { status: 423 });
  }

  const access = await requirePilotWriteActor(request);
  if (!access.allowed) return access.response;
  if (!access.actor?.workspaceId || !access.actor.userId) {
    return NextResponse.json({ error: "Pilot workspace context is required.", code: "pilot_workspace_required" }, { status: 403 });
  }
  try {
    await enforcePilotRateLimit({
      workspaceId: access.actor.workspaceId,
      userId: access.actor.userId,
      scope: "asset.upload",
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const { id: listingId } = await context.params;
    const listing = await getPilotListing(access.actor.workspaceId, listingId);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "A screenshot file is required." }, { status: 400 });
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP screenshots are accepted." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Screenshot must be between 1 byte and 10 MB." }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const db = getDatabase();
    const [alreadyStored] = await db
      .select()
      .from(caseAssets)
      .where(and(
        eq(caseAssets.workspaceId, access.actor.workspaceId),
        eq(caseAssets.listingId, listingId),
        eq(caseAssets.sha256, sha256),
      ))
      .limit(1);
    if (alreadyStored) {
      return NextResponse.json({
        asset: {
          id: alreadyStored.id,
          contentType: alreadyStored.contentType,
          sizeBytes: alreadyStored.sizeBytes,
          provenance: alreadyStored.provenance,
          createdAt: alreadyStored.createdAt.toISOString(),
        },
        viewUrl: `/api/assets/${alreadyStored.id}`,
      }, { status: 200 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const pathname = `brandarmor/${access.actor.workspaceId}/${listingId}/${randomUUID()}.${extension}`;
    const blob = await put(pathname, bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });

    let asset;
    try {
      const [created] = await db
        .insert(caseAssets)
        .values({
          workspaceId: access.actor.workspaceId,
          listingId,
          objectKey: blob.pathname,
          contentType: file.type,
          sizeBytes: file.size,
          sha256,
          provenance: "user_uploaded_screenshot",
          retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deletedAt: null,
        })
        .onConflictDoNothing({ target: [caseAssets.workspaceId, caseAssets.listingId, caseAssets.sha256] })
        .returning();
      const persisted = created ?? (await db
        .select()
        .from(caseAssets)
        .where(and(
          eq(caseAssets.workspaceId, access.actor.workspaceId),
          eq(caseAssets.listingId, listingId),
          eq(caseAssets.sha256, sha256),
        ))
        .limit(1))[0];
      if (!persisted) throw new Error("Private case asset persistence failed.");
      if (created) {
        await db.insert(auditEvents).values({
          workspaceId: access.actor.workspaceId,
          actorUserId: access.actor.userId,
          action: "case_asset.uploaded",
          entityType: "case_asset",
          entityId: persisted.id,
          correlationId: listingId,
          safeMetadata: { listingId, contentType: file.type, sizeBytes: file.size },
        });
      }
      asset = { persisted, created: Boolean(created) };
    } catch (persistenceError) {
      try { await del(blob.pathname); } catch { /* retention cleanup can retry an orphaned object if deletion fails */ }
      throw persistenceError;
    }
    if (!asset.created) {
      try { await del(blob.pathname); } catch { /* duplicate upload leaves existing stored asset intact */ }
    }

    return NextResponse.json({
      asset: {
        id: asset.persisted.id,
        contentType: asset.persisted.contentType,
        sizeBytes: asset.persisted.sizeBytes,
        provenance: asset.persisted.provenance,
        createdAt: asset.persisted.createdAt.toISOString(),
      },
      viewUrl: `/api/assets/${asset.persisted.id}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    console.error("BrandArmor private screenshot upload failed", error);
    return NextResponse.json({ error: "Could not store the private screenshot.", code: "private_asset_upload_failed" }, { status: 500 });
  }
}

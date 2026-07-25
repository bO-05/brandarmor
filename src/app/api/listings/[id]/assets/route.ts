import { createHash, randomUUID } from "node:crypto";

import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { createPilotCaseAsset } from "@/db/case-assets-repository";
import { getDatabase } from "@/db";
import { auditEvents } from "@/db/schema";
import { getPilotListing } from "@/db/listings-repository";
import { requirePilotWriteActor } from "@/lib/auth/route-guard";
import { controlledDemoReadOnlyPayload, isControlledDemoMode } from "@/lib/runtime-mode";
import { enforcePilotRateLimit, PilotRateLimitError } from "@/lib/pilot-controls";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type RouteContext = { params: Promise<{ id: string }> };

function configuredPrivateBlobStore(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
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
  if (!configuredPrivateBlobStore()) {
    return NextResponse.json({
      error: "Private case-asset storage is not configured. Connect a private Vercel Blob store before uploading screenshots.",
      code: "private_asset_storage_not_configured",
    }, { status: 503 });
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
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const pathname = `brandarmor/${access.actor.workspaceId}/${listingId}/${randomUUID()}.${extension}`;
    const blob = await put(pathname, bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });

    const asset = await createPilotCaseAsset(access.actor.workspaceId, {
      listingId,
      objectKey: blob.pathname,
      contentType: file.type,
      sizeBytes: file.size,
      sha256,
      provenance: "user_uploaded_screenshot",
      retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await getDatabase().insert(auditEvents).values({
      workspaceId: access.actor.workspaceId,
      actorUserId: access.actor.userId,
      action: "case_asset.uploaded",
      entityType: "case_asset",
      entityId: asset.id,
      correlationId: listingId,
      safeMetadata: { listingId, contentType: file.type, sizeBytes: file.size },
    });

    return NextResponse.json({
      asset: {
        id: asset.id,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        provenance: asset.provenance,
        createdAt: asset.createdAt.toISOString(),
      },
      viewUrl: `/api/assets/${asset.id}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof PilotRateLimitError) {
      return NextResponse.json({ error: error.message, code: "pilot_rate_limited" }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not store the private screenshot." }, { status: 500 });
  }
}

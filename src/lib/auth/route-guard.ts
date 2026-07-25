import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DatabaseConfigurationError } from "@/db";
import { PilotWorkspaceAccessError, resolvePilotWorkspace } from "@/db/workspace-access";

import { isClerkConfigured, isPilotRuntime } from "./config";

export type PilotActor = {
  externalSubject: string;
  externalOrganizationId: string;
  workspaceId?: string;
  userId?: string;
  role: "admin" | "reviewer";
};

export type PilotWriteGuard =
  | { allowed: true; actor: PilotActor | null }
  | { allowed: false; response: NextResponse };

/**
 * Route handlers call this before a pilot write. It intentionally does not rely
 * on Proxy alone: the resource-owning handler verifies configuration, identity,
 * organization, and role close to the mutation.
 */
export async function requirePilotWriteActor(): Promise<PilotWriteGuard> {
  if (!isPilotRuntime()) return { allowed: true, actor: null };

  if (!isClerkConfigured()) {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "Pilot authentication is not configured.",
        code: "pilot_auth_not_configured",
      }, { status: 503 }),
    };
  }

  let session: Awaited<ReturnType<typeof auth>>;
  try {
    session = await auth();
  } catch {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "Clerk session verification failed. Check the Preview Clerk keys and deployment URL settings.",
        code: "pilot_auth_unavailable",
      }, { status: 503 }),
    };
  }

  if (!session.isAuthenticated || !session.userId) {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "Authentication is required for pilot writes.",
        code: "pilot_auth_required",
      }, { status: 401 }),
    };
  }

  if (!session.orgId || !session.orgRole) {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "An active workspace is required for pilot writes.",
        code: "pilot_workspace_required",
      }, { status: 403 }),
    };
  }

  if (session.orgRole !== "org:admin" && session.orgRole !== "org:member") {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "The active organization role is not approved for BrandArmor pilot writes.",
        code: "pilot_workspace_role_unsupported",
      }, { status: 403 }),
    };
  }

  const actor: PilotActor = {
    externalSubject: session.userId,
    externalOrganizationId: session.orgId,
    role: session.orgRole === "org:admin" ? "admin" : "reviewer",
  };

  try {
    const workspace = await resolvePilotWorkspace(actor);
    return {
      allowed: true,
      actor: {
        ...actor,
        workspaceId: workspace.workspaceId,
        userId: workspace.userId,
        role: workspace.role,
      },
    };
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return {
        allowed: false,
        response: NextResponse.json({
          error: "Pilot database is not configured.",
          code: "pilot_database_not_configured",
        }, { status: 503 }),
      };
    }
    if (error instanceof PilotWorkspaceAccessError) {
      return {
        allowed: false,
        response: NextResponse.json({
          error: error.message,
          code: error.code,
        }, { status: 403 }),
      };
    }
    throw error;
  }
}

export async function requirePilotAdminActor(): Promise<PilotWriteGuard> {
  const access = await requirePilotWriteActor();
  if (!access.allowed || !access.actor?.workspaceId) return access;
  if (access.actor.role !== "admin") {
    return {
      allowed: false,
      response: NextResponse.json({
        error: "A BrandArmor workspace admin role is required for this action.",
        code: "pilot_workspace_admin_required",
      }, { status: 403 }),
    };
  }
  return access;
}

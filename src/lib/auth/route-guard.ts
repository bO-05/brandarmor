import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured, isPilotRuntime } from "./config";

export type PilotActor = {
  externalSubject: string;
  externalOrganizationId: string;
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

  const session = await auth();
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

  return {
    allowed: true,
    actor: {
      externalSubject: session.userId,
      externalOrganizationId: session.orgId,
      role: session.orgRole === "org:admin" ? "admin" : "reviewer",
    },
  };
}

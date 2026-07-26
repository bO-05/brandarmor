import { and, eq } from "drizzle-orm";

import type { PilotActor } from "@/lib/auth/route-guard";

import { getDatabase } from "./index";
import { users, workspaceMembers, workspaces } from "./schema";

export class PilotWorkspaceAccessError extends Error {
  constructor(
    public readonly code: "pilot_workspace_bootstrap_forbidden" | "pilot_workspace_membership_required",
    message: string,
  ) {
    super(message);
    this.name = "PilotWorkspaceAccessError";
  }
}

export type PilotWorkspaceAccess = {
  workspaceId: string;
  userId: string;
  role: "admin" | "reviewer";
};

/**
 * Resolves Clerk's active Organization into a BrandArmor workspace and enforces
 * membership at the application data boundary. An Organization admin may
 * bootstrap an empty workspace; ordinary members must already be mapped.
 */
export async function assertPilotWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const db = getDatabase();
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!membership) throw new PilotWorkspaceAccessError("pilot_workspace_membership_required", "The requested user does not belong to this BrandArmor workspace.");
}

export async function resolvePilotWorkspace(actor: PilotActor): Promise<PilotWorkspaceAccess> {
  const db = getDatabase();
  const [existingWorkspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.externalOrganizationId, actor.externalOrganizationId))
    .limit(1);

  if (!existingWorkspace && actor.role !== "admin") {
    throw new PilotWorkspaceAccessError(
      "pilot_workspace_bootstrap_forbidden",
      "Only a Clerk organization admin can create the initial BrandArmor workspace.",
    );
  }

  if (!existingWorkspace) {
    await db
      .insert(workspaces)
      .values({
        externalOrganizationId: actor.externalOrganizationId,
        name: `Clerk organization ${actor.externalOrganizationId}`,
      })
      .onConflictDoNothing({ target: workspaces.externalOrganizationId });
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.externalOrganizationId, actor.externalOrganizationId))
    .limit(1);
  if (!workspace) throw new Error("Workspace bootstrap did not resolve a workspace.");

  await db
    .insert(users)
    .values({
      externalSubject: actor.externalSubject,
      displayName: actor.externalSubject,
    })
    .onConflictDoNothing({ target: users.externalSubject });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalSubject, actor.externalSubject))
    .limit(1);
  if (!user) throw new Error("User bootstrap did not resolve a user.");

  // Clerk's Organization membership is the authorization source. The database
  // mirrors its effective role through a conflict-safe upsert so concurrent
  // first requests cannot create duplicate or stale workspace membership.
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: actor.role })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role: actor.role },
    });

  return { workspaceId: workspace.id, userId: user.id, role: actor.role };
}

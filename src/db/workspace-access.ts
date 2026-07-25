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
export async function resolvePilotWorkspace(actor: PilotActor): Promise<PilotWorkspaceAccess> {
  const db = getDatabase();
  const [existingWorkspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.externalOrganizationId, actor.externalOrganizationId))
    .limit(1);

  let workspaceId = existingWorkspace?.id;
  if (!workspaceId) {
    if (actor.role !== "admin") {
      throw new PilotWorkspaceAccessError(
        "pilot_workspace_bootstrap_forbidden",
        "Only a Clerk organization admin can create the initial BrandArmor workspace.",
      );
    }
    const [createdWorkspace] = await db
      .insert(workspaces)
      .values({
        externalOrganizationId: actor.externalOrganizationId,
        name: `Clerk organization ${actor.externalOrganizationId}`,
      })
      .returning({ id: workspaces.id });
    workspaceId = createdWorkspace.id;
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalSubject, actor.externalSubject))
    .limit(1);

  let userId = existingUser?.id;
  if (!userId) {
    const [createdUser] = await db
      .insert(users)
      .values({
        externalSubject: actor.externalSubject,
        displayName: actor.externalSubject,
      })
      .returning({ id: users.id });
    userId = createdUser.id;
  }

  const [scopedMembership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ))
    .limit(1);

  const desiredRole = actor.role;
  if (!scopedMembership) {
    if (actor.role !== "admin") {
      throw new PilotWorkspaceAccessError(
        "pilot_workspace_membership_required",
        "The signed-in Clerk member is not mapped to this BrandArmor workspace.",
      );
    }
    await db.insert(workspaceMembers).values({ workspaceId, userId, role: desiredRole });
  } else if (scopedMembership.role !== desiredRole) {
    await db
      .update(workspaceMembers)
      .set({ role: desiredRole })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ));
  }

  return { workspaceId, userId, role: desiredRole };
}

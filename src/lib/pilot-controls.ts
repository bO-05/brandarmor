import { and, count, eq, gte } from "drizzle-orm";

import { getDatabase } from "@/db";
import { auditEvents } from "@/db/schema";

export class PilotRateLimitError extends Error {
  constructor(public readonly scope: string, public readonly retryAfterSeconds: number) {
    super(`Rate limit reached for ${scope}. Try again shortly.`);
    this.name = "PilotRateLimitError";
  }
}

export async function enforcePilotRateLimit({
  workspaceId,
  userId,
  scope,
  limit,
  windowSeconds,
}: {
  workspaceId: string;
  userId: string;
  scope: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - windowSeconds * 1_000);
  const action = `rate_limit.${scope}`;
  const [usage] = await db
    .select({ count: count() })
    .from(auditEvents)
    .where(and(
      eq(auditEvents.workspaceId, workspaceId),
      eq(auditEvents.actorUserId, userId),
      eq(auditEvents.action, action),
      gte(auditEvents.createdAt, cutoff),
    ));
  if ((usage?.count ?? 0) >= limit) throw new PilotRateLimitError(scope, windowSeconds);

  await db.insert(auditEvents).values({
    workspaceId,
    actorUserId: userId,
    action,
    entityType: "rate_limit",
    entityId: null,
    correlationId: crypto.randomUUID(),
    safeMetadata: { limit, windowSeconds },
  });
}

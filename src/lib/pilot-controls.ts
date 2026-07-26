import { sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { auditEvents, rateLimitBuckets } from "@/db/schema";

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
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1_000)) * windowSeconds * 1_000);
  const action = `rate_limit.${scope}`;
  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ workspaceId, userId, scope, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.workspaceId, rateLimitBuckets.userId, rateLimitBuckets.scope, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });
  if (!bucket || bucket.count > limit) throw new PilotRateLimitError(scope, windowSeconds);

  await db.insert(auditEvents).values({
    workspaceId,
    actorUserId: userId,
    action,
    entityType: "rate_limit",
    entityId: null,
    correlationId: crypto.randomUUID(),
    safeMetadata: { limit, windowSeconds, windowStart: windowStart.toISOString(), count: bucket.count },
  });
}

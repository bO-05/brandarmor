import { runPilotInvestigation } from "@/db/investigations-repository";
import { purgeExpiredRetentionRecords } from "@/db/retention-repository";

import { inngest } from "./inngest";

export const runInvestigation = inngest.createFunction(
  { id: "run-durable-investigation", retries: 3 },
  { event: "brandarmor/investigation.queued" },
  async ({ event, step }) => {
    const { workspaceId, userId, investigationId } = event.data;
    return step.run("persisted-investigation-state-machine", () =>
      runPilotInvestigation({ workspaceId, userId }, investigationId),
    );
  },
);

export const purgeExpiredRetention = inngest.createFunction(
  { id: "purge-expired-retention", retries: 3 },
  { cron: "0 3 * * *" },
  async ({ step }) => step.run("purge-expired-private-assets-and-reports", () => purgeExpiredRetentionRecords()),
);

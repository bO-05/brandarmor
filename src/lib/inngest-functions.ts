import { runPilotInvestigation } from "@/db/investigations-repository";

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

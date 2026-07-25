import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest";
import { purgeExpiredRetention, runInvestigation } from "@/lib/inngest-functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runInvestigation, purgeExpiredRetention],
  streaming: "allow",
});

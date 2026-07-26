import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest";
import { purgeExpiredRetention, runInvestigation } from "@/lib/inngest-functions";

export const maxDuration = 300;

const handler = serve({
  client: inngest,
  functions: [runInvestigation, purgeExpiredRetention],
  signingKey: process.env.INNGEST_SIGNING_KEY,
  streaming: "allow",
});

function unavailable() {
  return new Response(JSON.stringify({ error: "Durable worker is not configured.", code: "inngest_not_configured" }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Parameters<typeof handler.GET>[0], context: Parameters<typeof handler.GET>[1]) {
  if (!process.env.INNGEST_SIGNING_KEY && process.env.NODE_ENV !== "development") return unavailable();
  return handler.GET(request, context);
}

export async function POST(request: Parameters<typeof handler.POST>[0], context: Parameters<typeof handler.POST>[1]) {
  if (!process.env.INNGEST_SIGNING_KEY && process.env.NODE_ENV !== "development") return unavailable();
  return handler.POST(request, context);
}

export async function PUT(request: Parameters<typeof handler.PUT>[0], context: Parameters<typeof handler.PUT>[1]) {
  if (!process.env.INNGEST_SIGNING_KEY && process.env.NODE_ENV !== "development") return unavailable();
  return handler.PUT(request, context);
}

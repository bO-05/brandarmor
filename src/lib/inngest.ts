import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "brandarmor" });

export function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

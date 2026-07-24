export function isPilotRuntime(): boolean {
  return process.env.BRANDARMOR_RUNTIME_MODE === "pilot";
}

export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

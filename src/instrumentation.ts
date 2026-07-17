// Next.js instrumentation hook.
// Runs once per server / serverless cold start (before requests are served).
//
// On Vercel the data dir (/tmp) is ephemeral and per-instance, so a fresh
// instance starts with an empty store and visitors would see an empty workspace.
// Seeding here repopulates the idempotent demo dataset on every cold start so the
// live demo is never blank for a visitor or judge.
//
// Next.js also compiles instrumentation for edge contexts in development. Node-only
// persistence therefore stays inside the dashboard and demo routes, both of which
// call the deterministic seed guard before reading or creating demo data.
export async function register() {
  // Intentionally empty: request-entry routes own Node-only demo seeding.
}

// Next.js instrumentation hook.
// Runs once per server / serverless cold start (before requests are served).
//
// On Vercel the data dir (/tmp) is ephemeral and per-instance, so a fresh
// instance starts with an empty store and visitors would see an empty workspace.
// Seeding here repopulates the idempotent demo dataset on every cold start so the
// live demo is never blank for a visitor or judge.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureDemoSeeded } = await import("@/persistence/auto-seed");
    const result = ensureDemoSeeded();
    if (result.seeded) {
      console.log("[instrumentation] BrandArmor demo data seeded on startup");
    }
  } catch (err) {
    console.error("[instrumentation] demo seed skipped:", err);
  }
}

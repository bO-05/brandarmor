// Next.js instrumentation entrypoint.
//
// Next.js compiles instrumentation for edge-compatible development contexts, so
// Node-only persistence does not belong here. Demo-facing request entrypoints call
// ensureDemoSeeded() before reading the local temp store, preserving cold-start
// reliability without importing fs-backed persistence into this module.
export async function register() {
  // Intentionally empty: request-entry routes own Node-only demo seeding.
}

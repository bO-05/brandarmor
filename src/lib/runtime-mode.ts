export const CONTROLLED_DEMO_RUNTIME_MODE = "controlled_demo" as const;
export const CONTROLLED_DEMO_READ_ONLY_CODE = "controlled_demo_read_only" as const;

export function isControlledDemoMode(): boolean {
  return process.env.BRANDARMOR_RUNTIME_MODE === CONTROLLED_DEMO_RUNTIME_MODE;
}

export function controlledDemoReadOnlyPayload() {
  return {
    error: "This hosted workspace is in controlled demo mode.",
    code: CONTROLLED_DEMO_READ_ONLY_CODE,
    detail: "Viewing seeded evidence remains available. Creating data, applying labels, and running provider-backed actions are temporarily disabled.",
  };
}

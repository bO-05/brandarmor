import { describe, expect, it } from "vitest";

import { buildDemoSignalBadges } from "../src/lib/demo-signals";

describe("demo signal provenance badges", () => {
  it("labels real and mock providers for the one-click demo output", () => {
    const signals = buildDemoSignalBadges({
      ocrProvider: "mock",
      regulatoryProvider: "bpom_api",
      visualProvider: "mock",
      judgeProvider: "anthropic",
    });

    expect(signals).toEqual({
      ocr: expect.objectContaining({ mode: "mock", provider: "mock" }),
      bpom: expect.objectContaining({ mode: "real", provider: "bpom_api" }),
      visual: expect.objectContaining({ mode: "mock", provider: "mock" }),
      judge: expect.objectContaining({ mode: "real", provider: "anthropic" }),
    });
  });

  it("labels an unavailable visual check as roadmap rather than a broken mock result", () => {
    const signals = buildDemoSignalBadges({
      ocrProvider: "mock",
      regulatoryProvider: "bpom_api",
      visualProvider: "mock",
      visualStatus: "not_available",
      judgeProvider: "mock",
    });

    expect(signals.visual).toMatchObject({
      label: "Visual check",
      mode: "roadmap",
      provider: "not run in demo",
    });
  });
});

import { describe, expect, it } from "vitest";

import { buildDemoSignalBadges } from "../src/lib/demo-signals";

describe("demo signal provenance badges", () => {
  it("uses outcome-specific labels instead of provider-mode claims", () => {
    const signals = buildDemoSignalBadges({
      ocrProvider: "mock",
      regulatoryProvider: "bpom_api",
      regulatoryStatus: "match",
      visualProvider: "mock",
      judgeProvider: "anthropic",
    });

    expect(signals).toEqual({
      ocr: expect.objectContaining({ label: "Mock OCR fixture", mode: "mock", provider: "mock" }),
      bpom: expect.objectContaining({ label: "Live BPOM query: matched", mode: "real", provider: "bpom_api" }),
      visual: expect.objectContaining({ label: "Visual comparison: inconclusive", mode: "mock", provider: "mock" }),
      judge: expect.objectContaining({ label: "Evidence judge: completed", mode: "real", provider: "anthropic" }),
    });
  });

  it("does not present an unimplemented visual adapter as real evidence", () => {
    const signals = buildDemoSignalBadges({
      ocrProvider: "mock",
      regulatoryProvider: "bpom_api",
      visualProvider: "siglip_adapter",
      visualStatus: "inconclusive",
      judgeProvider: "mock",
    });

    expect(signals.visual.mode).toBe("mock");
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
      label: "Visual comparison unavailable",
      mode: "roadmap",
      provider: "not run in demo",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  appendInvestigationEvent,
  buildInvestigationContextPack,
  createInvestigationRun,
} from "../src/domain/investigation";

describe("investigation workflow state", () => {
  it("keeps execution state in the event log and pauses for human input", () => {
    const run = createInvestigationRun({
      id: "run_1",
      listingId: "listing_1",
      productId: "product_1",
      goal: "Review listing evidence without making a final counterfeit claim.",
      now: "2026-05-22T01:00:00.000Z",
    });

    const updated = appendInvestigationEvent(run, {
      id: "evt_1",
      type: "human_input_requested",
      actor: "agent",
      summary: "Reviewer approval is required before drafting enforcement output.",
      evidenceRefs: ["ev_price_1"],
      now: "2026-05-22T01:05:00.000Z",
      payload: { reason: "high_stakes_action" },
    });

    expect(run.status).toBe("running");
    expect(run.events).toHaveLength(0);
    expect(updated.status).toBe("waiting_for_human");
    expect(updated.events).toEqual([
      expect.objectContaining({
        id: "evt_1",
        investigationId: "run_1",
        listingId: "listing_1",
        type: "human_input_requested",
        evidenceRefs: ["ev_price_1"],
        at: "2026-05-22T01:05:00.000Z",
      }),
    ]);
  });

  it("builds a compact evidence context pack with missing proof and claim discipline", () => {
    const run = createInvestigationRun({
      id: "run_2",
      listingId: "listing_2",
      productId: "product_2",
      goal: "Route suspicious skincare marketplace evidence to review.",
      now: "2026-05-22T02:00:00.000Z",
    });

    const withEvents = [
      {
        id: "evt_1",
        type: "listing_registered" as const,
        actor: "system" as const,
        summary: "Candidate listing imported from marketplace search.",
        evidenceRefs: ["ev_listing_1"],
        now: "2026-05-22T02:01:00.000Z",
      },
      {
        id: "evt_2",
        type: "ocr_completed" as const,
        actor: "integration" as const,
        summary: "OCR found a suspect BPOM number on packaging.",
        evidenceRefs: ["ev_ocr_1", "ev_listing_1"],
        now: "2026-05-22T02:02:00.000Z",
      },
      {
        id: "evt_3",
        type: "score_computed" as const,
        actor: "system" as const,
        summary: "Score routed the listing to human review.",
        evidenceRefs: ["ev_score_1"],
        now: "2026-05-22T02:03:00.000Z",
      },
    ].reduce((current, event) => appendInvestigationEvent(current, event), run);

    const pack = buildInvestigationContextPack(withEvents, { maxEvents: 2 });

    expect(pack.recentEvents.map((event) => event.id)).toEqual(["evt_2", "evt_3"]);
    expect(pack.evidenceIds).toEqual(["ev_listing_1", "ev_ocr_1", "ev_score_1"]);
    expect(pack.completedSteps).toEqual(["listing_registered", "ocr_completed", "score_computed"]);
    expect(pack.missingEvidence).toContain("regulatory_check");
    expect(pack.missingEvidence).toContain("visual_comparison");
    expect(pack.missingEvidence).toContain("human_review");
    expect(pack.nextRecommendedActions).toContain("Check BPOM/NIE evidence against the official source.");
    expect(pack.doNotClaimReasons).toContain("No human review decision has been recorded.");
  });
});

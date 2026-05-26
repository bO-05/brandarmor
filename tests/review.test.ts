import { describe, it, expect } from "vitest";
import { transition, isValidTransition, getAllowedTransitions, isTerminal } from "../src/domain/review";

describe("isValidTransition", () => {
  it("allows pending -> confirmed_counterfeit", () => {
    expect(isValidTransition("pending", "confirmed_counterfeit")).toBe(true);
  });
  it("allows pending -> rejected_legitimate", () => {
    expect(isValidTransition("pending", "rejected_legitimate")).toBe(true);
  });
  it("allows pending -> needs_more_evidence", () => {
    expect(isValidTransition("pending", "needs_more_evidence")).toBe(true);
  });
  it("allows pending -> escalated", () => {
    expect(isValidTransition("pending", "escalated")).toBe(true);
  });
  it("disallows confirmed_counterfeit -> anything", () => {
    expect(isValidTransition("confirmed_counterfeit", "pending")).toBe(false);
    expect(isValidTransition("confirmed_counterfeit", "escalated")).toBe(false);
  });
  it("disallows rejected_legitimate -> anything", () => {
    expect(isValidTransition("rejected_legitimate", "pending")).toBe(false);
  });
  it("allows needs_more_evidence -> pending", () => {
    expect(isValidTransition("needs_more_evidence", "pending")).toBe(true);
  });
  it("allows escalated -> confirmed_counterfeit", () => {
    expect(isValidTransition("escalated", "confirmed_counterfeit")).toBe(true);
  });
  it("disallows escalated -> pending", () => {
    expect(isValidTransition("escalated", "pending")).toBe(false);
  });
});

describe("transition", () => {
  it("successfully transitions pending -> confirmed_counterfeit", () => {
    const result = transition("pending", "confirmed_counterfeit");
    expect(result.success).toBe(true);
    if (result.success) expect(result.newStatus).toBe("confirmed_counterfeit");
  });
  it("fails to transition confirmed_counterfeit -> pending", () => {
    const result = transition("confirmed_counterfeit", "pending");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Invalid transition");
  });
  it("fails to transition pending -> invalid_status", () => {
    const result = transition("pending", "random" as any);
    expect(result.success).toBe(false);
  });
});

describe("isTerminal", () => {
  it("confirmed_counterfeit is terminal", () => {
    expect(isTerminal("confirmed_counterfeit")).toBe(true);
  });
  it("rejected_legitimate is terminal", () => {
    expect(isTerminal("rejected_legitimate")).toBe(true);
  });
  it("pending is not terminal", () => {
    expect(isTerminal("pending")).toBe(false);
  });
});

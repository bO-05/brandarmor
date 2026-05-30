import type { ReviewStatus } from "./types";

const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ["confirmed_counterfeit", "likely_counterfeit", "rejected_legitimate", "gray_market_import", "expired_or_unsafe", "needs_more_evidence", "escalated"],
  confirmed_counterfeit: [],
  likely_counterfeit: ["confirmed_counterfeit", "rejected_legitimate", "needs_more_evidence", "escalated"],
  rejected_legitimate: [],
  gray_market_import: [],
  expired_or_unsafe: [],
  needs_more_evidence: ["pending", "confirmed_counterfeit", "likely_counterfeit", "rejected_legitimate", "gray_market_import", "expired_or_unsafe", "escalated"],
  escalated: ["confirmed_counterfeit", "likely_counterfeit", "rejected_legitimate", "gray_market_import", "expired_or_unsafe", "needs_more_evidence"],
};

export function isValidTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getAllowedTransitions(from: ReviewStatus): ReviewStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

export function transition(
  from: ReviewStatus,
  to: ReviewStatus
): { success: true; newStatus: ReviewStatus } | { success: false; error: string } {
  if (!isValidTransition(from, to)) {
    const allowed = getAllowedTransitions(from).join(", ") || "(terminal)";
    return { success: false, error: `Invalid transition from \"${from}\" to \"${to}\". Allowed: ${allowed}` };
  }
  return { success: true, newStatus: to };
}

export function isTerminal(status: ReviewStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending Review",
  confirmed_counterfeit: "Confirmed Counterfeit",
  likely_counterfeit: "Likely Counterfeit",
  rejected_legitimate: "Rejected (Legitimate)",
  gray_market_import: "Gray-market / Import",
  expired_or_unsafe: "Expired / Unsafe",
  needs_more_evidence: "Needs More Evidence",
  escalated: "Escalated",
};

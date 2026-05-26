import type { EvidenceId, ListingId, ProductId } from "./types";

export type InvestigationRunStatus = "running" | "waiting_for_human" | "completed" | "failed";

export type InvestigationActor = "system" | "agent" | "human" | "integration";

export type InvestigationEventType =
  | "listing_registered"
  | "evidence_collected"
  | "ocr_completed"
  | "regulatory_checked"
  | "visual_compared"
  | "score_computed"
  | "judge_assessed"
  | "human_input_requested"
  | "human_reviewed"
  | "error"
  | "note";

export interface InvestigationRun {
  id: string;
  listingId: ListingId;
  productId: ProductId | null;
  goal: string;
  status: InvestigationRunStatus;
  events: InvestigationEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationEvent {
  id: string;
  investigationId: string;
  listingId: ListingId;
  type: InvestigationEventType;
  actor: InvestigationActor;
  summary: string;
  evidenceRefs: EvidenceId[];
  payload: unknown | null;
  at: string;
}

export interface CreateInvestigationRunInput {
  id: string;
  listingId: ListingId;
  productId?: ProductId | null;
  goal: string;
  now?: string;
}

export interface AppendInvestigationEventInput {
  id: string;
  type: InvestigationEventType;
  actor: InvestigationActor;
  summary: string;
  evidenceRefs?: EvidenceId[];
  payload?: unknown | null;
  now?: string;
}

export interface InvestigationContextPack {
  investigationId: string;
  listingId: ListingId;
  productId: ProductId | null;
  goal: string;
  status: InvestigationRunStatus;
  recentEvents: InvestigationEvent[];
  evidenceIds: EvidenceId[];
  completedSteps: InvestigationEventType[];
  missingEvidence: string[];
  nextRecommendedActions: string[];
  doNotClaimReasons: string[];
}

export interface InvestigationContextOptions {
  maxEvents?: number;
}

const STEP_TO_MISSING_EVIDENCE = [
  { eventType: "ocr_completed", missing: "ocr_evidence" },
  { eventType: "regulatory_checked", missing: "regulatory_check" },
  { eventType: "visual_compared", missing: "visual_comparison" },
  { eventType: "judge_assessed", missing: "judge_assessment" },
  { eventType: "human_reviewed", missing: "human_review" },
] as const;

function timestamp(now?: string): string {
  return now ?? new Date().toISOString();
}

function uniqueEvidenceIds(events: InvestigationEvent[]): EvidenceId[] {
  return Array.from(new Set(events.flatMap((event) => event.evidenceRefs))).sort();
}

function uniqueCompletedSteps(events: InvestigationEvent[]): InvestigationEventType[] {
  return Array.from(new Set(events.map((event) => event.type)));
}

function statusAfterEvent(current: InvestigationRunStatus, event: InvestigationEvent): InvestigationRunStatus {
  if (event.type === "human_input_requested") return "waiting_for_human";
  if (event.type === "human_reviewed") return "completed";
  if (event.type === "error" && typeof event.payload === "object" && event.payload && "fatal" in event.payload) {
    return (event.payload as { fatal?: boolean }).fatal ? "failed" : current;
  }
  if (current === "waiting_for_human" && event.actor === "human") return "running";
  return current;
}

function missingEvidenceFor(events: InvestigationEvent[]): string[] {
  const completed = new Set(events.map((event) => event.type));
  return STEP_TO_MISSING_EVIDENCE
    .filter((step) => !completed.has(step.eventType))
    .map((step) => step.missing);
}

function nextActionsFor(missingEvidence: string[]): string[] {
  const actions: string[] = [];
  if (missingEvidence.includes("ocr_evidence")) actions.push("Run OCR on suspect packaging or listing imagery.");
  if (missingEvidence.includes("regulatory_check")) actions.push("Check BPOM/NIE evidence against the official source.");
  if (missingEvidence.includes("visual_comparison")) actions.push("Compare suspect imagery against official product references.");
  if (missingEvidence.includes("judge_assessment")) actions.push("Run the evidence judge over cited evidence IDs.");
  if (missingEvidence.includes("human_review")) actions.push("Route the case to human review before any final claim.");
  return actions;
}

function doNotClaimReasonsFor(events: InvestigationEvent[], missingEvidence: string[]): string[] {
  const reasons: string[] = [];
  if (missingEvidence.includes("human_review")) reasons.push("No human review decision has been recorded.");
  if (missingEvidence.includes("regulatory_check")) reasons.push("Official regulatory evidence has not been checked.");
  if (missingEvidence.includes("ocr_evidence")) reasons.push("OCR-visible packaging evidence is not available.");
  if (events.length === 0) reasons.push("No investigation events have been recorded.");
  return reasons;
}

export function createInvestigationRun(input: CreateInvestigationRunInput): InvestigationRun {
  const now = timestamp(input.now);
  return {
    id: input.id,
    listingId: input.listingId,
    productId: input.productId ?? null,
    goal: input.goal,
    status: "running",
    events: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendInvestigationEvent(
  run: InvestigationRun,
  input: AppendInvestigationEventInput
): InvestigationRun {
  const at = timestamp(input.now);
  const event: InvestigationEvent = {
    id: input.id,
    investigationId: run.id,
    listingId: run.listingId,
    type: input.type,
    actor: input.actor,
    summary: input.summary,
    evidenceRefs: input.evidenceRefs ?? [],
    payload: input.payload ?? null,
    at,
  };
  return {
    ...run,
    status: statusAfterEvent(run.status, event),
    events: [...run.events, event],
    updatedAt: at,
  };
}

export function buildInvestigationContextPack(
  run: InvestigationRun,
  options: InvestigationContextOptions = {}
): InvestigationContextPack {
  const maxEvents = Math.max(1, options.maxEvents ?? 8);
  const missingEvidence = missingEvidenceFor(run.events);
  return {
    investigationId: run.id,
    listingId: run.listingId,
    productId: run.productId,
    goal: run.goal,
    status: run.status,
    recentEvents: run.events.slice(-maxEvents),
    evidenceIds: uniqueEvidenceIds(run.events),
    completedSteps: uniqueCompletedSteps(run.events),
    missingEvidence,
    nextRecommendedActions: nextActionsFor(missingEvidence),
    doNotClaimReasons: doNotClaimReasonsFor(run.events, missingEvidence),
  };
}

import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, FileSearch, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { InvestigationTrail as InvestigationTrailData } from "@/lib/investigation-trail";

const iconByType = {
  listing_registered: FileSearch,
  evidence_collected: FileSearch,
  ocr_completed: CheckCircle2,
  regulatory_checked: ShieldCheck,
  visual_compared: FileSearch,
  score_computed: CheckCircle2,
  judge_assessed: CheckCircle2,
  human_input_requested: Clock3,
  human_reviewed: UserRoundCheck,
  error: AlertTriangle,
  note: CircleDashed,
};

function statusCopy(status: InvestigationTrailData["context"]["status"]): string {
  switch (status) {
    case "completed":
      return "Internal human review is recorded.";
    case "waiting_for_human":
      return "Awaiting an internal human decision.";
    case "failed":
      return "A required workflow step failed.";
    default:
      return "Evidence collection is in progress.";
  }
}

export function InvestigationTrail({ trail }: { trail: InvestigationTrailData }) {
  const { context } = trail;

  return (
    <section className="surface-card mb-5 rounded-lg p-5" aria-labelledby="investigation-trail-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Investigation trail</p>
          <h2 id="investigation-trail-title" className="mt-1 text-lg font-bold">Evidence, checks, and the human review gate</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{statusCopy(context.status)} Each entry is derived from stored case artifacts and does not make an automatic authenticity determination.</p>
        </div>
        <span className="status-pill bg-muted text-muted-foreground">{context.status.replaceAll("_", " ")}</span>
      </div>

      <ol className="mt-5 grid gap-3" aria-label="Investigation events">
        {context.recentEvents.map((event, index) => {
          const Icon = iconByType[event.type];
          return (
            <li key={event.id} className="relative flex gap-3 rounded-md border border-border bg-background p-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold">{index + 1}. {event.type.replaceAll("_", " ")}</p>
                  <span className="text-xs text-muted-foreground">{event.actor}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.summary}</p>
                {event.evidenceRefs.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Evidence IDs: {event.evidenceRefs.join(", ")}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-background p-3">
          <h3 className="text-sm font-semibold">Missing evidence</h3>
          {context.missingEvidence.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {context.missingEvidence.map((item) => <li key={item}>- {item.replaceAll("_", " ")}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">No required evidence gap is currently projected.</p>}
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <h3 className="text-sm font-semibold">Suggested next actions</h3>
          {context.nextRecommendedActions.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {context.nextRecommendedActions.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">Continue with the current internal review workflow.</p>}
        </div>
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
          <h3 className="text-sm font-semibold text-warning">Claim limits</h3>
          {context.doNotClaimReasons.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {context.doNotClaimReasons.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">The case still requires human review before any external action.</p>}
        </div>
      </div>
    </section>
  );
}

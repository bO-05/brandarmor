"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { getBaselineExplanation } from "@/lib/ui-ux";

export function BaselineExplainer({ className = "" }: { className?: string }) {
  const explanation = getBaselineExplanation();

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold">{explanation.title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{explanation.summary}</p>
      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Why this unlocks the pipeline</p>
        <p className="mt-1 text-sm text-muted-foreground">{explanation.nextStep}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {explanation.contextFields.map((field) => (
            <span key={field} className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{field}</span>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-md border border-success/30 bg-success/10 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Linking does
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {explanation.does.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            Linking does not
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {explanation.doesNot.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

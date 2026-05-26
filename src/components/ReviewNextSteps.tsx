"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReviewStatus } from "@/domain/types";
import { getReviewNextStepActions, getReviewStatusPresentation } from "@/lib/ui-ux";

export function ReviewNextSteps({
  listingId,
  status,
  title,
}: {
  listingId: string;
  status: ReviewStatus;
  title?: string | null;
}) {
  const actions = getReviewNextStepActions(listingId, status);
  const presentation = getReviewStatusPresentation(status);

  return (
    <div className="rounded-lg border border-success/30 bg-success/10 p-4">
      <p className="text-sm font-semibold">Review label saved: {presentation.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {title ? `${title} is updated for internal review. ` : "This evidence bundle is updated for internal review. "}
        Choose the next step below; no external report or enforcement action was triggered.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.href + action.label} href={action.href} className="rounded-md border border-border bg-background p-3 text-sm transition-colors hover:bg-muted">
            <span className="flex items-center justify-between gap-2 font-semibold">
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

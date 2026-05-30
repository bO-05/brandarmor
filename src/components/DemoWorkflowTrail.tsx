"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchJsonObject } from "@/lib/api-client";
import { selectAmbientStatus, type AmbientStatus, type AmbientStatusInput } from "@/lib/ui-ux";

const trail = [
  { href: "/", label: "Start status" },
  { href: "/demo", label: "Run demo" },
  { href: "/listings", label: "Listing workspace" },
  { href: "/review", label: "Review queue" },
  { href: "/evaluation", label: "Evaluation" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || (href !== "/demo" && pathname.startsWith(href));
}

export function DemoWorkflowTrail() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AmbientStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const ambient = await fetchJsonObject<AmbientStatusInput>("/api/status", {
          listingCount: 0,
          unlinkedListingCount: 0,
          unscoredListingCount: 0,
          pendingReviewCount: 0,
          highRiskScoreCount: 0,
          evaluationCaseCount: 0,
          reviewDecisionCount: 0,
          currentPath: pathname,
        });
        if (cancelled) return;

        setStatus(selectAmbientStatus({
          ...ambient.data,
          currentPath: pathname,
        }));
      } catch {
        setStatus(null);
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <nav aria-label="Demo workflow" className="mb-5 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {trail.map((step, index) => {
            const active = isActive(pathname, step.href);
            return (
              <li key={step.href} className="flex items-center gap-2">
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <Link
                  href={step.href}
                  className={`inline-flex min-h-7 items-center rounded-md px-2.5 font-semibold ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                >
                  {index + 1}. {step.label}
                </Link>
              </li>
            );
          })}
        </ol>
        {status && (
          <div className="flex flex-col gap-2 rounded-md bg-background/80 px-3 py-2 text-xs lg:max-w-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{status.headline}</p>
                <p className="mt-0.5 text-muted-foreground">{status.summary}</p>
              </div>
              <Link href={status.nextActionHref} className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground">
                {status.nextActionLabel}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

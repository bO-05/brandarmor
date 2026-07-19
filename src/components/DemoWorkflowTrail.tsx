"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAmbientStatus } from "@/components/AmbientStatusProvider";
import { selectAmbientStatus } from "@/lib/ui-ux";

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
  const ambient = useAmbientStatus();
  const status = ambient ? selectAmbientStatus({ ...ambient, currentPath: pathname }) : null;

  return (
    <nav aria-label="Demo workflow" className="mb-5 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ol className="grid grid-cols-2 gap-1 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          {trail.map((step, index) => {
            const active = isActive(pathname, step.href);
            return (
              <li key={step.href} className="flex min-w-0 items-center gap-2">
                {index > 0 && <span className="hidden text-muted-foreground sm:inline">/</span>}
                <Link
                  href={step.href}
                  className={`inline-flex min-h-8 w-full items-center justify-center rounded-md px-2.5 font-semibold sm:w-auto ${
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

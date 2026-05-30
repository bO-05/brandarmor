"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Shield, Building2, Package, ClipboardCheck, BarChart3, Search, PlayCircle } from "lucide-react";
import { fetchJsonObject } from "@/lib/api-client";
import { decorateSidebarNavigationGroups, getSidebarNavigationGroups, type AmbientStatusInput } from "@/lib/ui-ux";

const iconByHref = {
  "/": Shield,
  "/demo": PlayCircle,
  "/brands": Building2,
  "/discovery": Search,
  "/listings": Package,
  "/review": ClipboardCheck,
  "/evaluation": BarChart3,
};

export function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AmbientStatusInput | null>(null);

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

        setStatus({
          ...ambient.data,
          currentPath: pathname,
        });
      } catch {
        setStatus(null);
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, [pathname]);

  const groups = status
    ? decorateSidebarNavigationGroups(getSidebarNavigationGroups(), status)
    : getSidebarNavigationGroups();

  return (
    <aside className="shrink-0 border-b border-border bg-card md:flex md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r">
      <div className="p-4 border-b border-border md:p-5">
        <div className="flex items-center gap-2">
          <Image src="/brandarmor-icons/icon-color-transparent.svg" alt="" width={24} height={24} className="size-6 shrink-0" />
          <span className="font-bold text-lg">BrandArmor v4</span>
        </div>
      </div>
      <nav className="grid max-w-full gap-3 overflow-x-auto p-3 md:block md:flex-1 md:overflow-visible">
        {groups.map((group) => {
          const groupActive = group.items.some((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
          const content = (
            <div className="grid min-w-max grid-flow-col auto-cols-max gap-2 md:mt-2 md:block md:min-w-0">
              {group.items.map(({ href, label, badge, badgeTone }) => {
                const Icon = iconByHref[href as keyof typeof iconByHref] ?? Shield;
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                const badgeClass = badgeTone === "danger"
                  ? "bg-destructive/15 text-destructive"
                  : badgeTone === "warning"
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground";

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`mb-1 flex min-h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors md:gap-3 ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {badge && (
                      <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? "bg-primary-foreground/20 text-primary-foreground" : badgeClass}`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );

          if (group.id === "setup") {
            return (
              <details key={group.id} className="md:mt-3" open={group.defaultOpen || groupActive}>
                <summary className="min-h-10 cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {group.label}
                </summary>
                {content}
              </details>
            );
          }

          return (
            <section key={group.id}>
              <p className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground md:block">{group.label}</p>
              {content}
            </section>
          );
        })}
      </nav>
      <div className="hidden p-3 border-t border-border text-xs text-muted-foreground md:block">
        v0.4.2 - Vultur
      </div>
    </aside>
  );
}

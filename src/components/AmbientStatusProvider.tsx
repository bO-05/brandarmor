"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchJsonObject } from "@/lib/api-client";
import type { AmbientStatusInput } from "@/lib/ui-ux";

const STATUS_EVENT = "brandarmor:status-changed";

const fallbackStatus: AmbientStatusInput = {
  listingCount: 0,
  unlinkedListingCount: 0,
  unscoredListingCount: 0,
  pendingReviewCount: 0,
  highRiskScoreCount: 0,
  evaluationCaseCount: 0,
  reviewDecisionCount: 0,
};

type AmbientStatusPatch = Partial<AmbientStatusInput>;

type AmbientStatusContextValue = {
  status: AmbientStatusInput | null;
  refreshStatus: () => Promise<void>;
};

const AmbientStatusContext = createContext<AmbientStatusContextValue>({
  status: null,
  refreshStatus: async () => undefined,
});

export function AmbientStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AmbientStatusInput | null>(null);

  const refreshStatus = useCallback(async () => {
    const result = await fetchJsonObject<AmbientStatusInput>("/api/status", fallbackStatus, {
      init: { cache: "no-store" },
    });
    if (!result.error) setStatus(result.data);
  }, []);

  useEffect(() => {
    void refreshStatus();
    const handleStatusChange = (event: Event) => {
      const patch = (event as CustomEvent<AmbientStatusPatch>).detail;
      if (patch && Object.keys(patch).length > 0) {
        setStatus((current) => ({ ...(current ?? fallbackStatus), ...patch }));
        return;
      }
      void refreshStatus();
    };
    window.addEventListener(STATUS_EVENT, handleStatusChange);
    return () => window.removeEventListener(STATUS_EVENT, handleStatusChange);
  }, [refreshStatus]);

  return (
    <AmbientStatusContext.Provider value={{ status, refreshStatus }}>
      {children}
    </AmbientStatusContext.Provider>
  );
}

export function useAmbientStatus(): AmbientStatusInput | null {
  return useContext(AmbientStatusContext).status;
}

import DashboardPage from "./page-client";
import { hasEnvValue } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "BrandArmor Workspace",
  description: "Workspace status for evidence-backed suspicious listing review.",
};

export default function Page() {
  // Pilot dashboard data is loaded through authenticated workspace APIs in the
  // client. Do not seed or read per-instance JSON during server rendering.
  return (
    <DashboardPage
      initialData={{
        brands: 0,
        listings: 0,
        unlinkedListings: 0,
        unscoredListings: 0,
        pendingReviews: 0,
        highRisk: 0,
        reviewDecisions: 0,
        evaluationCases: 0,
        readiness: {
          mistralConfigured: hasEnvValue("MISTRAL_API_KEY"),
          anthropicConfigured: hasEnvValue("ANTHROPIC_API_KEY"),
          dataWritable: false,
          demoReady: false,
        },
      }}
    />
  );
}

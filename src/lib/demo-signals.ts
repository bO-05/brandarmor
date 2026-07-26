import type { LlmJudgeAssessment, OcrArtifact, RegulatoryCheck, VisualMatchEvidence } from "@/domain/types";

export type DemoSignalMode = "real" | "mock" | "roadmap";

export interface DemoSignalBadge {
  label: string;
  mode: DemoSignalMode;
  provider: string;
  detail: string | null;
}

export interface DemoSignalInput {
  ocrProvider: OcrArtifact["provider"];
  regulatoryProvider: RegulatoryCheck["provider"];
  visualProvider: VisualMatchEvidence["provider"];
  judgeProvider: LlmJudgeAssessment["provider"];
  regulatoryStatus?: RegulatoryCheck["status"] | null;
  visualStatus?: VisualMatchEvidence["status"] | null;
  bpomStatus?: string | null;
  bpomLookupDurationMs?: number | null;
}

export interface DemoSignalBadges {
  ocr: DemoSignalBadge;
  bpom: DemoSignalBadge;
  visual: DemoSignalBadge;
  judge: DemoSignalBadge;
}

function modeFromProvider(provider: string, realProviders: string[]): DemoSignalMode {
  return realProviders.includes(provider) ? "real" : "mock";
}

function bpomOutcomeLabel(provider: RegulatoryCheck["provider"], status: RegulatoryCheck["status"] | null | undefined): string {
  if (provider === "bpom_api") {
    if (status === "match" || status === "verified_active") return "Live BPOM query: matched";
    if (status === "not_found") return "Live BPOM query: no match";
    if (status === "mismatch" || status === "brand_mismatch") return "Live BPOM query: mismatch";
    return "Live BPOM query: unavailable";
  }
  if (provider === "mock") return "Mock BPOM fixture";
  return `BPOM check: ${(status ?? "not run").replaceAll("_", " ")}`;
}

export function buildDemoSignalBadges(input: DemoSignalInput): DemoSignalBadges {
  const bpomDetail = [
    input.regulatoryStatus ?? null,
    input.bpomStatus ? `BPOM ${input.bpomStatus}` : null,
    input.bpomLookupDurationMs != null ? `${input.bpomLookupDurationMs}ms` : null,
  ].filter(Boolean).join(" / ") || null;

  return {
    ocr: {
      label: input.ocrProvider === "mistral" ? "Live OCR: completed" : "Mock OCR fixture",
      mode: modeFromProvider(input.ocrProvider, ["mistral"]),
      provider: input.ocrProvider,
      detail: input.ocrProvider === "mistral" ? "Mistral OCR" : "demo OCR fixture",
    },
    bpom: {
      label: bpomOutcomeLabel(input.regulatoryProvider, input.regulatoryStatus),
      mode: modeFromProvider(input.regulatoryProvider, ["bpom_api"]),
      provider: input.regulatoryProvider,
      detail: bpomDetail,
    },
    visual: input.visualStatus === "not_available"
      ? {
          label: "Visual comparison unavailable",
          mode: "roadmap",
          provider: "not run in demo",
          detail: "No official and suspect image pair is available; no embedding score is shown.",
        }
      : {
          label: `Visual comparison: ${(input.visualStatus ?? "inconclusive").replaceAll("_", " ")}`,
          mode: modeFromProvider(input.visualProvider, ["manual"]),
          provider: input.visualProvider,
          detail: input.visualProvider === "mock" ? "adapter/mock similarity" : null,
        },
    judge: {
      label: input.judgeProvider === "mock" ? "Mock evidence judge" : "Evidence judge: completed",
      mode: modeFromProvider(input.judgeProvider, ["anthropic", "mistral"]),
      provider: input.judgeProvider,
      detail: input.judgeProvider === "mock" ? "deterministic fallback" : `${input.judgeProvider} evidence judge`,
    },
  };
}

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

export function buildDemoSignalBadges(input: DemoSignalInput): DemoSignalBadges {
  const bpomDetail = [
    input.regulatoryStatus ?? null,
    input.bpomStatus ? `BPOM ${input.bpomStatus}` : null,
    input.bpomLookupDurationMs != null ? `${input.bpomLookupDurationMs}ms` : null,
  ].filter(Boolean).join(" / ") || null;

  return {
    ocr: {
      label: "OCR",
      mode: modeFromProvider(input.ocrProvider, ["mistral"]),
      provider: input.ocrProvider,
      detail: input.ocrProvider === "mistral" ? "Mistral OCR" : "demo OCR fixture",
    },
    bpom: {
      label: "BPOM",
      mode: modeFromProvider(input.regulatoryProvider, ["bpom_api"]),
      provider: input.regulatoryProvider,
      detail: bpomDetail,
    },
    visual: input.visualStatus === "not_available"
      ? {
          label: "Visual check",
          mode: "roadmap",
          provider: "not run in demo",
          detail: "No official and suspect image pair is available; no embedding score is shown.",
        }
      : {
          label: "Visual",
          mode: modeFromProvider(input.visualProvider, ["siglip_adapter", "manual"]),
          provider: input.visualProvider,
          detail: input.visualProvider === "mock" ? "adapter/mock similarity" : null,
        },
    judge: {
      label: "Judge",
      mode: modeFromProvider(input.judgeProvider, ["anthropic", "mistral"]),
      provider: input.judgeProvider,
      detail: input.judgeProvider === "mock" ? "deterministic fallback" : `${input.judgeProvider} evidence judge`,
    },
  };
}

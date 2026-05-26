import { NextResponse } from "next/server";
import { hasEnvValue } from "@/lib/env";

type IntegrationState = {
  configured: boolean;
  implemented: boolean;
  mode: "real_optional" | "fallback_only" | "roadmap";
  provider: string;
  model?: string | null;
  notes: string;
};

function configured(name: string): boolean {
  return hasEnvValue(name);
}

export async function GET() {
  const integrations: Record<string, IntegrationState> = {
    mistralOcr: {
      configured: configured("MISTRAL_API_KEY"),
      implemented: true,
      mode: "real_optional",
      provider: process.env.BRANDARMOR_OCR_PROVIDER ?? "mistral",
      model: process.env.BRANDARMOR_OCR_MODEL ?? "mistral-ocr-latest",
      notes: "Used by OCR routes and demo when an externally reachable image URL is available.",
    },
    anthropicJudge: {
      configured: configured("ANTHROPIC_API_KEY"),
      implemented: true,
      mode: "real_optional",
      provider: "anthropic",
      model: process.env.BRANDARMOR_LLM_JUDGE_MODEL ?? "claude-sonnet-4-6",
      notes: "Used by the evidence judge. Auth/model config failures fall back to Mistral when configured, then explicit mock output.",
    },
    mistralJudgeFallback: {
      configured: configured("MISTRAL_API_KEY"),
      implemented: true,
      mode: "real_optional",
      provider: process.env.BRANDARMOR_LLM_JUDGE_FALLBACK_PROVIDER ?? "mistral",
      model: process.env.BRANDARMOR_LLM_JUDGE_FALLBACK_MODEL ?? "mistral-large-latest",
      notes: "Used when Anthropic is not selected/configured or as the configured fallback model path.",
    },
    perplexityDiscovery: {
      configured: configured("PERPLEXITY_API_KEY"),
      implemented: true,
      mode: "real_optional",
      provider: "perplexity",
      model: "sonar",
      notes: "Used for candidate discovery. Results remain leads and must be confirmed with evidence.",
    },
    bpomSearch: {
      configured: true,
      implemented: true,
      mode: "real_optional",
      provider: "cekbpom.pom.go.id",
      notes: "No key required. Public BPOM endpoint can still fail or change, so source URLs remain part of evidence review.",
    },
    browserUseCapture: {
      configured: configured("BROWSER_USE_ENDPOINT"),
      implemented: false,
      mode: "roadmap",
      provider: "browser-use",
      notes: "Configured in env for future user-guided capture, but this v0.4.2 app does not call it yet.",
    },
    huggingFaceVision: {
      configured: configured("HF_API_TOKEN"),
      implemented: false,
      mode: "roadmap",
      provider: "huggingface",
      notes: "Reserved for future image similarity/OCR benchmarks. Not used by current app routes.",
    },
  };

  return NextResponse.json({ integrations }, { headers: { "Cache-Control": "no-store" } });
}

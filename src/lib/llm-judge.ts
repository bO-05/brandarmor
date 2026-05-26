import type { Evidence, Listing, LlmJudgeAssessment, OcrArtifact, Product, RegulatoryCheck, Score, VisualMatchEvidence } from "@/domain/types";
import { envValue, hasEnvValue } from "@/lib/env";

export interface JudgeEvidenceBundle {
  listing: Listing;
  product?: Product;
  score?: Score;
  ocr?: OcrArtifact;
  evidence: Evidence[];
  regulatory?: RegulatoryCheck;
  visual?: VisualMatchEvidence;
}

type JudgePayload = Omit<LlmJudgeAssessment, "id" | "listingId" | "scoreId" | "createdAt" | "provider" | "model" | "rawJson" | "error">;

const DEFAULT_ANTHROPIC_MODEL = envValue("BRANDARMOR_LLM_JUDGE_MODEL") || "claude-sonnet-4-6";
const DEFAULT_MISTRAL_MODEL = envValue("BRANDARMOR_LLM_JUDGE_FALLBACK_MODEL") || "mistral-large-latest";
const JUDGE_TOOL_NAME = "judge_assessment";
const JUDGE_TOOL = {
  name: JUDGE_TOOL_NAME,
  description: "Return BrandArmor's evidence-bounded counterfeit-risk judge assessment.",
  input_schema: {
    type: "object",
    properties: {
      judgeRisk: { type: "string", enum: ["low", "medium", "high", "critical", "insufficient_evidence"] },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      supportedReasons: { type: "array", items: { type: "string" } },
      contradictions: { type: "array", items: { type: "string" } },
      missingEvidence: { type: "array", items: { type: "string" } },
      recommendedNextAction: { type: "string" },
      citedEvidenceIds: { type: "array", items: { type: "string" } },
      doNotClaimReasons: { type: "array", items: { type: "string" } },
    },
    required: [
      "judgeRisk",
      "confidence",
      "supportedReasons",
      "contradictions",
      "missingEvidence",
      "recommendedNextAction",
      "citedEvidenceIds",
      "doNotClaimReasons",
    ],
  },
};

function evidenceIds(bundle: JudgeEvidenceBundle): string[] {
  const ids = new Set<string>();
  for (const e of bundle.evidence.slice(0, 12)) ids.add(e.id);
  for (const r of bundle.score?.reasons ?? []) for (const id of r.evidenceRefs) ids.add(id);
  return Array.from(ids);
}

export function mockJudgeAssessment(bundle: JudgeEvidenceBundle): JudgePayload {
  const score = bundle.score?.totalScore ?? 0;
  const missing: string[] = [];
  if (!bundle.ocr) missing.push("Run Mistral OCR on suspect packaging/listing image.");
  if (!bundle.regulatory) missing.push("Check extracted BPOM/NIE against official BPOM evidence.");
  if (!bundle.visual || bundle.visual.status === "not_available") missing.push("Compare suspect packaging image against official reference images.");
  const cited = evidenceIds(bundle);
  const insufficient = missing.length >= 2 || cited.length === 0;
  return {
    judgeRisk: insufficient ? "insufficient_evidence" : score >= 80 ? "critical" : score >= 50 ? "high" : score >= 20 ? "medium" : "low",
    confidence: insufficient ? "low" : score >= 50 && bundle.ocr ? "medium" : "low",
    supportedReasons: cited.length
      ? (bundle.score?.reasons ?? []).slice(0, 5).map((r) => `${r.ruleName}: ${r.message}`)
      : [],
    contradictions: bundle.regulatory?.status === "match" && score >= 50 ? ["BPOM/NIE appears to match, but price/seller/packaging signals still require review."] : [],
    missingEvidence: missing,
    recommendedNextAction: insufficient ? "Collect OCR, BPOM, and visual evidence before making a counterfeit claim." : bundle.score?.recommendedAction ?? "review",
    citedEvidenceIds: cited,
    doNotClaimReasons: insufficient ? ["Insufficient cited evidence for a confirmed counterfeit claim."] : ["Human review is still required before final truth labeling."],
  };
}

function buildPrompt(bundle: JudgeEvidenceBundle): string {
  return [
    "You are BrandArmor's cosmetics counterfeit evidence judge.",
    "Analyze only the provided evidence. Do not infer from vibes or brand stereotypes.",
    "Every supported reason must cite evidence IDs. If evidence is weak, return insufficient_evidence.",
    `Use the ${JUDGE_TOOL_NAME} tool. Do not make final legal or authenticity claims.`,
    JSON.stringify({
      productBaseline: bundle.product,
      suspectListing: bundle.listing,
      score: bundle.score,
      ocrParsedFields: bundle.ocr?.parsedFields,
      regulatory: bundle.regulatory,
      visual: bundle.visual,
      evidence: bundle.evidence.slice(0, 20),
    }),
  ].join("\n\n");
}

function normalizeJudgePayload(parsed: Partial<JudgePayload>, fallback: JudgePayload): JudgePayload {
  const cited = Array.isArray(parsed.citedEvidenceIds) ? parsed.citedEvidenceIds.filter((x): x is string => typeof x === "string") : [];
  if (cited.length === 0 && parsed.judgeRisk !== "insufficient_evidence") {
    return { ...fallback, judgeRisk: "insufficient_evidence", confidence: "low", doNotClaimReasons: ["Judge response did not cite evidence IDs."] };
  }
  return {
    judgeRisk: parsed.judgeRisk ?? fallback.judgeRisk,
    confidence: parsed.confidence ?? fallback.confidence,
    supportedReasons: Array.isArray(parsed.supportedReasons) ? parsed.supportedReasons.map(String) : fallback.supportedReasons,
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions.map(String) : fallback.contradictions,
    missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence.map(String) : fallback.missingEvidence,
    recommendedNextAction: parsed.recommendedNextAction ?? fallback.recommendedNextAction,
    citedEvidenceIds: cited,
    doNotClaimReasons: Array.isArray(parsed.doNotClaimReasons) ? parsed.doNotClaimReasons.map(String) : fallback.doNotClaimReasons,
  };
}

function safeParseJudge(rawText: string, fallback: JudgePayload): JudgePayload {
  const jsonText = rawText.match(/\{[\s\S]*\}/)?.[0] ?? rawText;
  try {
    return normalizeJudgePayload(JSON.parse(jsonText) as Partial<JudgePayload>, fallback);
  } catch {
    return {
      ...fallback,
      doNotClaimReasons: [
        ...fallback.doNotClaimReasons,
        "LLM judge response was not valid JSON; deterministic evidence fallback was used.",
      ],
    };
  }
}

function parseAnthropicJudge(raw: any, fallback: JudgePayload): JudgePayload {
  const toolUse = raw?.content?.find?.((block: any) => block?.type === "tool_use" && block?.name === JUDGE_TOOL_NAME);
  if (toolUse?.input && typeof toolUse.input === "object") {
    return normalizeJudgePayload(toolUse.input as Partial<JudgePayload>, fallback);
  }
  const text = raw?.content?.map?.((c: any) => c?.text).filter(Boolean).join("\n") ?? "";
  return safeParseJudge(text, fallback);
}

function isProviderConfigFallback(status: number, raw: any): boolean {
  const text = JSON.stringify(raw ?? {}).toLowerCase();
  return status === 401 ||
    status === 403 ||
    text.includes("authentication") ||
    text.includes("unauthorized") ||
    text.includes("invalid api key") ||
    text.includes("invalid x-api-key") ||
    text.includes("invalid model") ||
    text.includes("model not found") ||
    text.includes("not_found_error");
}

function explicitMockFallback(
  provider: "anthropic" | "mistral",
  responseStatus: number,
  fallback: JudgePayload
): Omit<LlmJudgeAssessment, "id" | "listingId" | "scoreId" | "createdAt"> {
  return {
    provider: "mock",
    model: "mock-evidence-judge",
    ...fallback,
    rawJson: {
      mock: true,
      fallbackFrom: provider,
      providerConfigFallback: true,
      providerStatus: responseStatus,
    },
    error: null,
  };
}

async function runMistralJudge(
  prompt: string,
  fallback: JudgePayload,
  fallbackContext?: { from: "anthropic"; status: number; errorType?: string | null }
): Promise<Omit<LlmJudgeAssessment, "id" | "listingId" | "scoreId" | "createdAt">> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${envValue("MISTRAL_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: DEFAULT_MISTRAL_MODEL, temperature: 0, messages: [{ role: "user", content: prompt }] }),
  });
  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    if (isProviderConfigFallback(response.status, raw)) return explicitMockFallback("mistral", response.status, fallback);
    return { provider: "mistral", model: DEFAULT_MISTRAL_MODEL, ...fallback, rawJson: raw, error: raw?.message ?? `Mistral judge failed with HTTP ${response.status}` };
  }
  const text = raw?.choices?.[0]?.message?.content ?? "";
  return {
    provider: "mistral",
    model: DEFAULT_MISTRAL_MODEL,
    ...safeParseJudge(text, fallback),
    rawJson: fallbackContext
      ? { providerRaw: raw, fallbackFrom: fallbackContext.from, fallbackStatus: fallbackContext.status, fallbackErrorType: fallbackContext.errorType ?? null }
      : raw,
    error: null,
  };
}

export async function runLlmJudge(bundle: JudgeEvidenceBundle, forceMock = false): Promise<Omit<LlmJudgeAssessment, "id" | "listingId" | "scoreId" | "createdAt">> {
  const fallback = mockJudgeAssessment(bundle);
  const provider = envValue("BRANDARMOR_LLM_JUDGE_PROVIDER") || "anthropic";
  if (forceMock) return { provider: "mock", model: "mock-evidence-judge", ...fallback, rawJson: { mock: true }, error: null };

  const prompt = buildPrompt(bundle);
  if (provider === "anthropic" && hasEnvValue("ANTHROPIC_API_KEY")) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": envValue("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 2400,
        temperature: 0,
        tools: [JUDGE_TOOL],
        tool_choice: { type: "tool", name: JUDGE_TOOL_NAME },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      if (isProviderConfigFallback(response.status, raw)) {
        if (hasEnvValue("MISTRAL_API_KEY")) return runMistralJudge(prompt, fallback, { from: "anthropic", status: response.status, errorType: raw?.error?.type ?? null });
        return explicitMockFallback("anthropic", response.status, fallback);
      }
      return { provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL, ...fallback, rawJson: raw, error: raw?.error?.message ?? `Anthropic judge failed with HTTP ${response.status}` };
    }
    return { provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL, ...parseAnthropicJudge(raw, fallback), rawJson: raw, error: null };
  }

  if (hasEnvValue("MISTRAL_API_KEY")) {
    return runMistralJudge(prompt, fallback);
  }

  return { provider: "mock", model: "mock-evidence-judge", ...fallback, rawJson: { mock: true }, error: null };
}

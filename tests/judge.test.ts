import { afterEach, describe, expect, it, vi } from "vitest";
import { mockJudgeAssessment, runLlmJudge } from "../src/lib/llm-judge";
import type { Evidence, Listing, Score } from "../src/domain/types";

const realFetch = globalThis.fetch;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalMistralKey = process.env.MISTRAL_API_KEY;
const originalJudgeProvider = process.env.BRANDARMOR_LLM_JUDGE_PROVIDER;

const listing: Listing = {
  id: "l1",
  productId: "p1",
  title: "ExampleBrand Serum No BPOM Murah",
  description: null,
  price: 25000,
  currency: "IDR",
  sellerName: "beauty_racikan",
  marketplace: "shopee",
  listingUrl: "https://example.com/listing",
  imageUrls: ["https://example.com/suspect.png"],
  screenshotUrl: null,
  sourceConfidence: 0.8,
  rightsStatus: "manual_observation",
  limitations: [],
  groundTruth: null,
  observedAt: "2026-05-07T00:00:00Z",
  rawSource: null,
  sourceType: "manual",
  ocrStatus: "completed",
  ocrRequestedAt: null,
  ocrCompletedAt: null,
  createdAt: "2026-05-07T00:00:00Z",
};

const score: Score = {
  id: "s1",
  listingId: "l1",
  totalScore: 88,
  ruleScore: 82,
  calibratedScore: 88,
  confidenceBand: "strong",
  riskLevel: "critical",
  recommendedAction: "enforce",
  reasons: [{ ruleId: "BPOM_NIE_MISMATCH", ruleName: "BPOM / NIE Mismatch", message: "BPOM missing", points: 30, evidenceRefs: ["e1"] }],
  features: {
    ruleScore: 82,
    ocrSuspiciousTermCount: 1,
    priceAnomalyRatio: 0.86,
    sellerAuthorized: false,
    sourceConfidence: 0.8,
    imageSimilarityScore: 0.3,
    regulatoryStatus: "not_found",
    bpomNieMatch: false,
    packagingFieldMismatchCount: 2,
    ocrConfidence: 0.9,
    evidenceCompleteness: 0.9,
  },
  scoringVersion: "test",
  triggeredRuleIds: ["BPOM_NIE_MISMATCH"],
  createdAt: "2026-05-07T00:00:00Z",
};

const evidence: Evidence[] = [{
  id: "e1",
  listingId: "l1",
  evidenceType: "regulatory_check",
  fieldName: "regulatory_status",
  extractedValue: "not_found",
  rawValue: null,
  confidence: 0.9,
  notes: null,
  createdAt: "2026-05-07T00:00:00Z",
}];

describe("LLM evidence judge guardrails", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalMistralKey === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = originalMistralKey;
    if (originalJudgeProvider === undefined) delete process.env.BRANDARMOR_LLM_JUDGE_PROVIDER;
    else process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = originalJudgeProvider;
    vi.restoreAllMocks();
  });

  it("cites evidence and does not replace human truth", () => {
    const assessment = mockJudgeAssessment({
      listing,
      score,
      evidence,
      ocr: { id: "o1", listingId: "l1", provider: "mock", model: "mock", status: "completed", sourceImageUrl: null, markdown: "No BPOM", rawJson: null, averageConfidence: 0.9, suspiciousTermCount: 1, extractedFields: {}, parsedFields: { bpomNie: null, volumeOrSize: null, expiryDate: null, batchOrLot: null, barcodeOrQrText: null, ingredientsText: null, claims: ["No BPOM"], brandMentions: [], productMentions: [] }, usageInfo: null, error: null, createdAt: "2026-05-07T00:00:00Z" },
      regulatory: { id: "r1", listingId: "l1", productId: "p1", provider: "mock", query: "NA18240123456", extractedNie: null, expectedNie: "NA18240123456", status: "not_found", matchedProductName: null, matchedBrandName: null, sourceUrl: null, notes: null, createdAt: "2026-05-07T00:00:00Z" },
      visual: { id: "v1", listingId: "l1", productId: "p1", provider: "mock", suspectImageUrl: "https://example.com/suspect.png", referenceImageUrls: ["https://example.com/ref.png"], similarityScore: 0.3, status: "mismatch", evidenceSummary: "weak", createdAt: "2026-05-07T00:00:00Z" },
    });
    expect(assessment.judgeRisk).toBe("critical");
    expect(assessment.citedEvidenceIds).toContain("e1");
    expect(assessment.doNotClaimReasons.join(" ")).toContain("Human review");
  });

  it("returns insufficient evidence when no evidence ids exist", () => {
    const assessment = mockJudgeAssessment({ listing, score, evidence: [] });
    expect(assessment.judgeRisk).toBe("insufficient_evidence");
    expect(assessment.confidence).toBe("low");
    expect(assessment.doNotClaimReasons.length).toBeGreaterThan(0);
  });

  it("falls back to an explicit mock judge on invalid Anthropic credentials", async () => {
    process.env.ANTHROPIC_API_KEY = "invalid-key";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    delete process.env.MISTRAL_API_KEY;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { type: "authentication_error", message: "invalid x-api-key" },
    }), { status: 401, headers: { "content-type": "application/json" } })) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("mock");
    expect(assessment.model).toBe("mock-evidence-judge");
    expect(assessment.error).toBeNull();
    expect(JSON.stringify(assessment.rawJson)).not.toContain("invalid x-api-key");
  });

  it("tries the configured Mistral judge fallback when Anthropic auth fails", async () => {
    process.env.ANTHROPIC_API_KEY = "invalid-key";
    process.env.MISTRAL_API_KEY = "valid-fallback-key";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes("anthropic.com")) {
        return new Response(JSON.stringify({
          error: { type: "authentication_error", message: "invalid x-api-key" },
        }), { status: 401, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              judgeRisk: "critical",
              confidence: "medium",
              supportedReasons: ["BPOM evidence e1 supports review"],
              contradictions: [],
              missingEvidence: [],
              recommendedNextAction: "enforce",
              citedEvidenceIds: ["e1"],
              doNotClaimReasons: ["Human review is still required before final truth labeling."],
            }),
          },
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("mistral");
    expect(assessment.judgeRisk).toBe("critical");
    expect(assessment.citedEvidenceIds).toContain("e1");
    expect((assessment.rawJson as any).fallbackFrom).toBe("anthropic");
    expect((assessment.rawJson as any).fallbackStatus).toBe(401);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("strips surrounding quotes from the Anthropic API key before provider calls", async () => {
    process.env.ANTHROPIC_API_KEY = "\"sk-ant-test\"";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    delete process.env.MISTRAL_API_KEY;
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ "x-api-key": "sk-ant-test" });
      return new Response(JSON.stringify({
        content: [{
          text: JSON.stringify({
            judgeRisk: "critical",
            confidence: "medium",
            supportedReasons: ["BPOM evidence e1 supports review"],
            contradictions: [],
            missingEvidence: [],
            recommendedNextAction: "enforce",
            citedEvidenceIds: ["e1"],
            doNotClaimReasons: ["Human review is still required before final truth labeling."],
          }),
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("anthropic");
    expect(assessment.citedEvidenceIds).toContain("e1");
  });

  it("parses Anthropic forced tool-use judge output", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    delete process.env.MISTRAL_API_KEY;
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tool_choice).toEqual({ type: "tool", name: "judge_assessment" });
      return new Response(JSON.stringify({
        content: [{
          type: "tool_use",
          name: "judge_assessment",
          input: {
            judgeRisk: "critical",
            confidence: "medium",
            supportedReasons: ["BPOM evidence e1 supports review"],
            contradictions: [],
            missingEvidence: [],
            recommendedNextAction: "enforce",
            citedEvidenceIds: ["e1"],
            doNotClaimReasons: ["Human review is still required before final truth labeling."],
          },
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("anthropic");
    expect(assessment.judgeRisk).toBe("critical");
    expect(assessment.citedEvidenceIds).toContain("e1");
  });

  it("does not crash when a real judge returns malformed JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    delete process.env.MISTRAL_API_KEY;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      content: [{ text: "{\"judgeRisk\":\"critical\",\"citedEvidenceIds\":[\"e1\"" }],
    }), { status: 200, headers: { "content-type": "application/json" } })) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("anthropic");
    expect(assessment.error).toBeNull();
    expect(assessment.citedEvidenceIds).toContain("e1");
    expect(assessment.doNotClaimReasons.join(" ")).toContain("not valid JSON");
  });

  it("falls back to an explicit mock judge on invalid Mistral credentials", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.MISTRAL_API_KEY = "invalid-key";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "mistral";
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      message: "Unauthorized",
    }), { status: 401, headers: { "content-type": "application/json" } })) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("mock");
    expect(assessment.model).toBe("mock-evidence-judge");
    expect(assessment.error).toBeNull();
    expect(JSON.stringify(assessment.rawJson)).not.toContain("Unauthorized");
  });

  it("falls back to an explicit mock judge on invalid provider model config", async () => {
    process.env.ANTHROPIC_API_KEY = "set";
    process.env.BRANDARMOR_LLM_JUDGE_PROVIDER = "anthropic";
    delete process.env.MISTRAL_API_KEY;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { type: "invalid_request_error", message: "model not found" },
    }), { status: 400, headers: { "content-type": "application/json" } })) as any;

    const assessment = await runLlmJudge({ listing, score, evidence }, false);

    expect(assessment.provider).toBe("mock");
    expect(assessment.model).toBe("mock-evidence-judge");
    expect(assessment.error).toBeNull();
    expect(JSON.stringify(assessment.rawJson)).not.toContain("model not found");
  });
});

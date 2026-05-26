import { afterEach, describe, expect, it, vi } from "vitest";
import { countSuspiciousTerms, extractFieldsFromOcr, mockOcrResult, parseCosmeticsPackagingFields, processMistralOcr } from "../src/lib/mistral-ocr";

const realFetch = globalThis.fetch;
const originalMistralKey = process.env.MISTRAL_API_KEY;
const originalOcrModel = process.env.BRANDARMOR_OCR_MODEL;

describe("v4 OCR evidence utilities", () => {
  afterEach(() => {
    if (originalMistralKey === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = originalMistralKey;
    if (originalOcrModel === undefined) delete process.env.BRANDARMOR_OCR_MODEL;
    else process.env.BRANDARMOR_OCR_MODEL = originalOcrModel;
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("counts counterfeit terms in OCR text", () => {
    expect(countSuspiciousTerms("Somethinc serum KW Super Grade AAA mirror quality")).toBeGreaterThanOrEqual(3);
  });

  it("extracts useful fields from OCR markdown", () => {
    const fields = extractFieldsFromOcr([
      "Somethinc Gentle Bright Serum KW",
      "Rp 132.050",
      "Toko: somethinc_official",
      "Batch SM-001",
    ].join("\n"));
    expect(fields.price_text).toContain("Rp");
    expect(fields.seller_or_store_text).toContain("Toko");
    expect(fields.claim_text).toContain("KW");
    expect(fields.sku_or_batch_text).toContain("Batch");
  });

  it("mock OCR returns auditable evidence shape", () => {
    const result = mockOcrResult({ listingId: "l1", imageUrl: "https://example.com/a.png", forceMock: true });
    expect(result.provider).toBe("mock");
    expect(result.status).toBe("completed");
    expect(result.markdown.length).toBeGreaterThan(20);
    expect(result.suspiciousTermCount).toBe(0);
    expect(result.extractedFields.claim_text).toBeTruthy();
  });

  it("uses a Gloglowing mock profile for Gloglowing demo screenshots", () => {
    const result = mockOcrResult({ listingId: "l1", imageUrl: "https://example.com/gloglowing-baby-glow-suspect.png", forceMock: true });
    expect(result.markdown).toContain("Gloglowing");
    expect(result.parsedFields.bpomNie).toBe("NA00001234567");
    expect(result.parsedFields.volumeOrSize).toBe("4ml");
  });

  it("uses BRANDARMOR_OCR_MODEL for non-demo OCR calls", async () => {
    delete process.env.MISTRAL_API_KEY;
    process.env.BRANDARMOR_OCR_MODEL = "custom-ocr-model";

    const result = await processMistralOcr({ listingId: "l1", imageUrl: "https://example.com/non-demo.png" });

    expect(result.model).toBe("custom-ocr-model");
    expect(result.status).toBe("failed");
  });

  it("strips surrounding quotes from the Mistral API key before provider calls", async () => {
    process.env.MISTRAL_API_KEY = "'mistral-test-key'";
    process.env.BRANDARMOR_OCR_MODEL = "mistral-ocr-latest";
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: "Bearer mistral-test-key" });
      return new Response(JSON.stringify({
        model: "mistral-ocr-latest",
        pages: [{ markdown: "ExampleBrand Serum NA18240123456 30ml", confidence_scores: { average: 0.91 } }],
        usage_info: { pages_processed: 1 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as any;

    const result = await processMistralOcr({ listingId: "l1", imageUrl: "https://example.com/non-demo.png" });

    expect(result.provider).toBe("mistral");
    expect(result.status).toBe("completed");
    expect(result.parsedFields.bpomNie).toBe("NA18240123456");
  });

  it("extracts cosmetics packaging fields", () => {
    const parsed = parseCosmeticsPackagingFields([
      "ExampleBrand Vitamin C Serum",
      "NA18240123456",
      "30ml",
      "Batch GN24A",
      "Exp 12/2027",
      "Ingredients: aqua, niacinamide, vitamin c",
      "Brightening dermatologically tested",
    ].join("\n"));
    expect(parsed.bpomNie).toBe("NA18240123456");
    expect(parsed.volumeOrSize).toBe("30ml");
    expect(parsed.batchOrLot).toContain("Batch");
    expect(parsed.ingredientsText).toContain("niacinamide");
    expect(parsed.claims.length).toBeGreaterThan(0);
  });
});

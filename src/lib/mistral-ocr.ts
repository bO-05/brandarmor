import type { OcrArtifact, ParsedPackagingFields } from "@/domain/types";
import { envValue } from "@/lib/env";

const FALLBACK_MODEL = "mistral-ocr-latest";

const SUSPICIOUS_TERMS = [
  "kw", "replica", "replika", "grade", "super copy", "copy", "imitasi",
  "tiruan", "mirror", "1:1", "premium grade", "aspal", "oem",
  "bpom palsu", "no bpom", "tanpa bpom", "share in jar", "racikan",
];

export interface OcrProcessInput {
  listingId: string;
  imageUrl: string;
  apiKey?: string;
  forceMock?: boolean;
}

export interface OcrProcessResult {
  provider: OcrArtifact["provider"];
  model: string;
  status: OcrArtifact["status"];
  sourceImageUrl: string | null;
  markdown: string;
  rawJson: unknown | null;
  averageConfidence: number | null;
  suspiciousTermCount: number;
  extractedFields: Record<string, string>;
  parsedFields: ParsedPackagingFields;
  usageInfo: unknown | null;
  error: string | null;
}

export function countSuspiciousTerms(text: string): number {
  const lower = text.toLowerCase();
  return SUSPICIOUS_TERMS.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0);
}

export function extractFieldsFromOcr(markdown: string): Record<string, string> {
  const lines = markdown.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    return trimmed ? [trimmed] : [];
  });
  const fields: Record<string, string> = {};
  const price = markdown.match(/(?:rp|idr)\s*([0-9][0-9.,]*)/i);
  if (price) fields.price_text = price[0];
  const seller = lines.find((l) => /seller|toko|shop|official|store/i.test(l));
  if (seller) fields.seller_or_store_text = seller;
  const claim = lines.find((l) => /kw|replica|replika|grade|copy|mirror|original|resmi/i.test(l));
  if (claim) fields.claim_text = claim;
  const sku = lines.find((l) => /sku|serial|batch|kode/i.test(l));
  if (sku) fields.sku_or_batch_text = sku;
  const bpom = markdown.match(/\b(?:NA|NB|NC|ND|NE)\s*\d[\d\s-]{8,14}\d\b/i);
  if (bpom) fields.bpom_nie = bpom[0].replace(/\s+/g, "");
  const volume = markdown.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|mL|ML|g|gr|gram)\b/);
  if (volume) fields.volume_or_size = volume[0];
  const expiry = markdown.match(/\b(?:exp|expired|expiry|ed|kedaluwarsa|kadaluarsa)[:\s-]*([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4}|[01]?\d[\/.-]\d{2,4})\b/i);
  if (expiry) fields.expiry_date = expiry[0];
  return fields;
}

export function parseCosmeticsPackagingFields(markdown: string): ParsedPackagingFields {
  const lines = markdown.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    return trimmed ? [trimmed] : [];
  });
  const bpom = markdown.match(/\b(?:NA|NB|NC|ND|NE)\s*\d[\d\s-]{8,14}\d\b/i);
  const volume = markdown.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|mL|ML|g|gr|gram)\b/);
  const expiry = markdown.match(/\b(?:exp|expired|expiry|ed|kedaluwarsa|kadaluarsa)[:\s-]*([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4}|[01]?\d[\/.-]\d{2,4})\b/i);
  const batch = lines.find((l) => /\b(batch|lot|kode produksi|no\.?\s*batch)\b/i.test(l)) ?? null;
  const barcode = lines.find((l) => /\b(barcode|qr|ean|upc)\b/i.test(l)) ?? null;
  const ingredients = lines.find((l) => /\b(ingredients|komposisi|composition|aqua|niacinamide|retinol|salicylic|hyaluronic)\b/i.test(l)) ?? null;
  const claims = lines.filter((l) => /\b(whitening|brightening|acne|glowing|original|resmi|bpom|dermatology|paraben|mercury|hydroquinone|racikan|share in jar)\b/i.test(l)).slice(0, 8);
  const brandMentions = lines.filter((l) => /\b(official|cosmetic|skincare|serum|cream|toner|sunscreen|lotion)\b/i.test(l)).slice(0, 5);
  const productMentions = lines.filter((l) => /\b(serum|cream|toner|sunscreen|cleanser|moisturizer|essence|mask)\b/i.test(l)).slice(0, 5);
  return {
    bpomNie: bpom ? bpom[0].replace(/\s+/g, "").toUpperCase() : null,
    volumeOrSize: volume ? volume[0] : null,
    expiryDate: expiry ? expiry[0] : null,
    batchOrLot: batch,
    barcodeOrQrText: barcode,
    ingredientsText: ingredients,
    claims,
    brandMentions,
    productMentions,
  };
}

function flattenMarkdown(raw: any): string {
  const pages = Array.isArray(raw?.pages) ? raw.pages : [];
  const text = pages.flatMap((p: any) => p?.markdown ? [p.markdown] : []).join("\n\n");
  return text || "";
}

function confidenceFromRaw(raw: any): number | null {
  const pages = Array.isArray(raw?.pages) ? raw.pages : [];
  const scores = pages.flatMap((p: any) => {
    const score = p?.confidence_scores?.average ?? p?.confidence_scores?.page?.average;
    return typeof score === "number" ? [score] : [];
  });
  if (!scores.length) return null;
  return Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 1000) / 1000;
}

export function mockOcrResult(input: OcrProcessInput): OcrProcessResult {
  const lowerUrl = input.imageUrl.toLowerCase();
  const markdown = lowerUrl.includes("gloglowing")
    ? [
      "# Marketplace screenshot OCR",
      "Gloglowing Baby Glow Lip Serum KW Super",
      "Rp 29.000",
      "Toko: glowing_diskon_88",
      "Klaim: original, BPOM, return kalau palsu",
      "BPOM: NA00001234567",
      "Size: 4ml",
    ].join("\n")
    : [
    "# Marketplace screenshot OCR",
    "Somethinc Calm Down PHA 3% Soothing Everyday Toner",
    "Rp 49.000",
    "Toko: skincare_diskon_88",
    "Klaim: soothing, calming, original",
    "BPOM: NA18211900160",
    "Size: 100ml",
  ].join("\n");
  return {
    provider: "mock",
    model: "mock-mistral-ocr",
    status: "completed",
    sourceImageUrl: input.imageUrl,
    markdown,
    rawJson: { mock: true, pages: [{ index: 0, markdown }] },
    averageConfidence: 0.82,
    suspiciousTermCount: countSuspiciousTerms(markdown),
    extractedFields: extractFieldsFromOcr(markdown),
    parsedFields: parseCosmeticsPackagingFields(markdown),
    usageInfo: { mock: true },
    error: null,
  };
}

export async function processMistralOcr(input: OcrProcessInput): Promise<OcrProcessResult> {
  const apiKey = input.apiKey ?? envValue("MISTRAL_API_KEY");
  const model = process.env.BRANDARMOR_OCR_MODEL || FALLBACK_MODEL;
  if (input.forceMock) return mockOcrResult(input);
  if (!apiKey) {
    return {
      provider: "mistral",
      model,
      status: "failed",
      sourceImageUrl: input.imageUrl,
      markdown: "",
      rawJson: null,
      averageConfidence: null,
      suspiciousTermCount: 0,
      extractedFields: {},
      parsedFields: parseCosmeticsPackagingFields(""),
      usageInfo: null,
      error: "MISTRAL_API_KEY is not configured. Use Demo OCR only for non-production testing.",
    };
  }

  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      document: {
        type: "image_url",
        image_url: input.imageUrl,
      },
      include_image_base64: false,
      confidence_scores_granularity: "page",
    }),
  });

  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      provider: "mistral",
      model,
      status: "failed",
      sourceImageUrl: input.imageUrl,
      markdown: "",
      rawJson: raw,
      averageConfidence: null,
      suspiciousTermCount: 0,
      extractedFields: {},
      parsedFields: parseCosmeticsPackagingFields(""),
      usageInfo: raw?.usage_info ?? null,
      error: raw?.message ?? raw?.error?.message ?? `Mistral OCR failed with HTTP ${response.status}`,
    };
  }

  const markdown = flattenMarkdown(raw);
  return {
    provider: "mistral",
    model: raw?.model ?? model,
    status: "completed",
    sourceImageUrl: input.imageUrl,
    markdown,
    rawJson: raw,
    averageConfidence: confidenceFromRaw(raw),
    suspiciousTermCount: countSuspiciousTerms(markdown),
    extractedFields: extractFieldsFromOcr(markdown),
    parsedFields: parseCosmeticsPackagingFields(markdown),
    usageInfo: raw?.usage_info ?? null,
    error: null,
  };
}

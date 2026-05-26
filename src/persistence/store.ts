import fs from "fs";
import os from "os";
import path from "path";

import type { Brand, Product, Listing, Evidence, Score, ReviewDecision, ReviewStatus, EvaluationCase, OcrArtifact, RegulatoryCheck, VisualMatchEvidence, LlmJudgeAssessment,
} from "@/domain/types";
import type { InsertBrand, InsertProduct, InsertListing, InsertReviewDecision, InsertEvaluationCase, InsertEvidence } from "@/domain/schemas";
import { uid } from "@/lib/utils";
import { computeScore } from "@/domain/scoring";

let _explicitDataDir: string | null = null;

export function setDataDir(dir: string | null): void {
  _explicitDataDir = dir;
}

export function resetDataDir(): void {
  _explicitDataDir = null;
}

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function isWritableServerlessDataDir(dir: string): boolean {
  const normalized = dir.replace(/\\/g, "/");
  return normalized === "/tmp" || normalized.startsWith("/tmp/");
}

function getServerlessDataDir(): string {
  return path.join(os.tmpdir(), ".brandarmor-data");
}

export function getDataDir(): string {
  if (_explicitDataDir) return _explicitDataDir;
  // On Vercel / AWS Lambda / read-only-cwd serverless environments,
  // use /tmp which is the only writable filesystem area.
  // VERCEL=1 is injected automatically in Vercel functions; AWS_LAMBDA_FUNCTION_NAME for AWS.
  if (isServerlessRuntime()) {
    const envDataDir = process.env.BRANDARMOR_DATA_DIR;
    if (envDataDir && isWritableServerlessDataDir(envDataDir)) return envDataDir;
    return getServerlessDataDir();
  }
  if (process.env.BRANDARMOR_DATA_DIR) return process.env.BRANDARMOR_DATA_DIR;
  return path.resolve(process.cwd(), ".brandarmor-data");
}

function ensureDataDir(): string {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function isDataDirWritable(): boolean {
  const dir = getDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function dbPath(name: string): string {
  return path.join(ensureDataDir(), `${name}.json`);
}

function readJson<T>(name: string): T[] {
  const p = dbPath(name);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return []; }
}

function writeJson(name: string, data: unknown): void {
  const tmp = dbPath(name) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, dbPath(name));
}

// --- Brand Operations ---
export function getBrands(): Brand[] {
  return readJson<Brand>("brands").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBrand(id: string): Brand | undefined {
  return getBrands().find((b) => b.id === id);
}

export function createBrand(data: InsertBrand): Brand {
  const now = new Date().toISOString();
  const brand: Brand = { id: uid(), name: data.name, description: data.description ?? null, websiteUrl: data.websiteUrl ?? null, logoUrl: data.logoUrl ?? null, createdAt: now, updatedAt: now };
  const brands = getBrands();
  brands.push(brand);
  writeJson("brands", brands);
  return brand;
}

// --- Product Operations ---
export function getProducts(brandId?: string): Product[] {
  const all = readJson<Product>("products").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return brandId ? all.filter((p) => p.brandId === brandId) : all;
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function createProduct(data: InsertProduct): Product {
  const now = new Date().toISOString();
  const product: Product = {
    id: uid(), brandId: data.brandId, name: data.name,
    sku: data.sku ?? null, msrp: data.msrp ?? null, msrpCurrency: data.msrpCurrency ?? "IDR",
    msrpMin: data.msrpMin ?? null, msrpMax: data.msrpMax ?? null, description: data.description ?? null,
    officialUrls: data.officialUrls ?? [], officialImageUrls: data.officialImageUrls ?? [],
    requiredKeywords: data.requiredKeywords ?? [], suspiciousTerms: data.suspiciousTerms ?? [],
    counterfeitTerms: data.counterfeitTerms ?? [], authorizedSellers: data.authorizedSellers ?? [],
    packagingNotes: data.packagingNotes ?? null, labelNotes: data.labelNotes ?? null,
    referenceImageNotes: data.referenceImageNotes ?? null,
    category: data.category ?? "skincare_cosmetics",
    variant: data.variant ?? null,
    sizeLabel: data.sizeLabel ?? null,
    bpomNie: data.bpomNie ?? null,
    ingredientsHighlights: data.ingredientsHighlights ?? [],
    packagingClaims: data.packagingClaims ?? [],
    createdAt: now, updatedAt: now,
  };
  const products = getProducts();
  products.push(product);
  writeJson("products", products);
  return product;
}

// --- Listing Operations ---
export function getListings(productId?: string): Listing[] {
  const all = readJson<Listing>("listings").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return productId ? all.filter((l) => l.productId === productId) : all;
}

export function getListing(id: string): Listing | undefined {
  return getListings().find((l) => l.id === id);
}

export function createListing(data: InsertListing): Listing {
  const now = new Date().toISOString();
  const listing: Listing = {
    id: uid(), productId: data.productId ?? null,
    title: data.title ?? null, description: data.description ?? null,
    price: data.price ?? null, currency: data.currency ?? "IDR",
    sellerName: data.sellerName ?? null, marketplace: data.marketplace ?? null,
    listingUrl: data.listingUrl ?? null, imageUrls: data.imageUrls ?? [],
    screenshotUrl: data.screenshotUrl ?? null, sourceConfidence: data.sourceConfidence ?? 0.6,
    rightsStatus: data.rightsStatus ?? "unknown", limitations: data.limitations ?? [],
    groundTruth: data.groundTruth ?? null,
    observedAt: data.observedAt ?? now, rawSource: data.rawSource ?? null,
    sourceType: data.sourceType ?? "manual",
    ocrStatus: "not_requested", ocrRequestedAt: null, ocrCompletedAt: null,
    createdAt: now,
  };
  const listings = getListings();
  listings.push(listing);
  writeJson("listings", listings);
  createEvidenceFromListing(listing);
  return listing;
}

export function createListingsBulk(data: InsertListing[]): Listing[] {
  const now = new Date().toISOString();
  const listings = getListings();
  const results: Listing[] = [];
  for (const d of data) {
    const listing: Listing = {
      id: uid(), productId: d.productId ?? null,
      title: d.title ?? null, description: d.description ?? null,
      price: d.price ?? null, currency: d.currency ?? "IDR",
      sellerName: d.sellerName ?? null, marketplace: d.marketplace ?? null,
      listingUrl: d.listingUrl ?? null, imageUrls: d.imageUrls ?? [],
      screenshotUrl: d.screenshotUrl ?? null, sourceConfidence: d.sourceConfidence ?? 0.6,
      rightsStatus: d.rightsStatus ?? "unknown", limitations: d.limitations ?? [],
      groundTruth: d.groundTruth ?? null,
      observedAt: d.observedAt ?? now, rawSource: d.rawSource ?? null,
      sourceType: d.sourceType ?? "json_import",
      ocrStatus: "not_requested", ocrRequestedAt: null, ocrCompletedAt: null,
      createdAt: now,
    };
    listings.push(listing);
    results.push(listing);
  }
  writeJson("listings", listings);
  for (const l of results) { createEvidenceFromListing(l); }
  return results;
}

export function updateListing(id: string, data: Partial<Listing>): Listing | undefined {
  const listings = getListings();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  listings[idx] = { ...listings[idx], ...data };
  writeJson("listings", listings);
  return listings[idx];
}

// --- Score Operations ---
export function getScore(listingId: string): Score | undefined {
  return getScores().find((s) => s.listingId === listingId);
}

export function getScores(): Score[] {
  return readJson<Score>("scores").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createScore(data: Omit<Score, "id" | "createdAt">): Score {
  const now = new Date().toISOString();
  const scores = getScores();
  const existing = scores.findIndex((s) => s.listingId === data.listingId);
  const score: Score = { id: uid(), ...data, createdAt: now };
  if (existing >= 0) scores[existing] = score;
  else scores.push(score);
  writeJson("scores", scores);
  return score;
}

// --- OCR Artifact Operations ---
export function getOcrArtifacts(listingId?: string): OcrArtifact[] {
  const all = readJson<OcrArtifact>("ocr_artifacts").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return listingId ? all.filter((a) => a.listingId === listingId) : all;
}

export function getLatestOcrArtifact(listingId: string): OcrArtifact | undefined {
  return getOcrArtifacts(listingId)[0];
}

export function createOcrArtifact(data: Omit<OcrArtifact, "id" | "createdAt">): OcrArtifact {
  const artifact: OcrArtifact = { id: uid(), ...data, createdAt: new Date().toISOString() };
  const all = readJson<OcrArtifact>("ocr_artifacts");
  all.push(artifact);
  writeJson("ocr_artifacts", all);
  return artifact;
}

export function clearOcrEvidenceForListing(listingId: string): void {
  const all = readJson<Evidence>("evidence");
  const filtered = all.filter((e) => {
    if (e.listingId !== listingId) return true;
    return !e.fieldName.startsWith("ocr_") && e.evidenceType !== "ocr_signal";
  });
  if (filtered.length !== all.length) writeJson("evidence", filtered);
}

// --- Regulatory Check Operations ---
export function getRegulatoryChecks(listingId?: string): RegulatoryCheck[] {
  const all = readJson<RegulatoryCheck>("regulatory_checks").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return listingId ? all.filter((r) => r.listingId === listingId) : all;
}

export function getLatestRegulatoryCheck(listingId: string): RegulatoryCheck | undefined {
  return getRegulatoryChecks(listingId)[0];
}

export function createRegulatoryCheck(data: Omit<RegulatoryCheck, "id" | "createdAt">): RegulatoryCheck {
  const record: RegulatoryCheck = { id: uid(), ...data, createdAt: new Date().toISOString() };
  const all = readJson<RegulatoryCheck>("regulatory_checks");
  all.push(record);
  writeJson("regulatory_checks", all);
  return record;
}

// --- Visual Match Operations ---
export function getVisualMatches(listingId?: string): VisualMatchEvidence[] {
  const all = readJson<VisualMatchEvidence>("visual_matches").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return listingId ? all.filter((v) => v.listingId === listingId) : all;
}

export function getLatestVisualMatch(listingId: string): VisualMatchEvidence | undefined {
  return getVisualMatches(listingId)[0];
}

export function createVisualMatch(data: Omit<VisualMatchEvidence, "id" | "createdAt">): VisualMatchEvidence {
  const record: VisualMatchEvidence = { id: uid(), ...data, createdAt: new Date().toISOString() };
  const all = readJson<VisualMatchEvidence>("visual_matches");
  all.push(record);
  writeJson("visual_matches", all);
  return record;
}

// --- LLM Judge Operations ---
export function getLlmJudgeAssessments(listingId?: string): LlmJudgeAssessment[] {
  const all = readJson<LlmJudgeAssessment>("llm_judge_assessments").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return listingId ? all.filter((j) => j.listingId === listingId) : all;
}

export function getLatestLlmJudgeAssessment(listingId: string): LlmJudgeAssessment | undefined {
  return getLlmJudgeAssessments(listingId)[0];
}

export function createLlmJudgeAssessment(data: Omit<LlmJudgeAssessment, "id" | "createdAt">): LlmJudgeAssessment {
  const record: LlmJudgeAssessment = { id: uid(), ...data, createdAt: new Date().toISOString() };
  const all = readJson<LlmJudgeAssessment>("llm_judge_assessments");
  all.push(record);
  writeJson("llm_judge_assessments", all);
  return record;
}

// --- Review Decision Operations ---
export function getReviewDecisions(): ReviewDecision[] {
  return readJson<ReviewDecision>("review_decisions").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getReviewDecision(listingId: string): ReviewDecision | undefined {
  return getReviewDecisions().find((d) => d.listingId === listingId);
}

export function createReviewDecision(data: InsertReviewDecision): ReviewDecision {
  const now = new Date().toISOString();
  const decisions = getReviewDecisions();
  const existing = decisions.findIndex((d) => d.listingId === data.listingId);
  const decision: ReviewDecision = {
    id: uid(), listingId: data.listingId, scoreId: data.scoreId,
    status: (data.status ?? "pending") as ReviewStatus,
    reviewer: data.reviewer ?? null, notes: data.notes ?? null,
    decidedAt: now, createdAt: now, updatedAt: now,
  };
  if (existing >= 0) decisions[existing] = decision;
  else decisions.push(decision);
  writeJson("review_decisions", decisions);
  return decision;
}

export function updateReviewDecision(
  listingId: string, status: ReviewStatus,
  reviewer?: string | null, notes?: string | null
): ReviewDecision | undefined {
  const now = new Date().toISOString();
  const decisions = getReviewDecisions();
  const idx = decisions.findIndex((d) => d.listingId === listingId);
  if (idx === -1) return undefined;
  decisions[idx] = { ...decisions[idx], status, reviewer: reviewer ?? null, notes: notes ?? null, updatedAt: now };
  writeJson("review_decisions", decisions);
  return decisions[idx];
}

// --- Evaluation Case Operations ---
export function getEvaluationCases(): EvaluationCase[] {
  return readJson<EvaluationCase>("evaluation_cases").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createEvaluationCase(data: InsertEvaluationCase): EvaluationCase {
  const now = new Date().toISOString();
  const c: EvaluationCase = {
    id: uid(),
    listing: {
      title: data.title ?? null, description: data.description ?? null,
      price: data.price ?? null, currency: data.currency ?? null,
      sellerName: data.sellerName ?? null, marketplace: data.marketplace ?? null,
      listingUrl: data.listingUrl ?? null, imageUrls: data.imageUrls ?? [],
      screenshotUrl: null, sourceConfidence: 0.6, rightsStatus: "user_submitted",
      limitations: [], groundTruth: data.groundTruth,
      observedAt: data.observedAt ?? now,
      ocrStatus: "not_requested", ocrRequestedAt: null, ocrCompletedAt: null,
    },
    groundTruth: data.groundTruth, notes: data.notes ?? null, createdAt: now,
  };
  const cases = getEvaluationCases();
  cases.push(c);
  writeJson("evaluation_cases", cases);
  return c;
}

export function createEvaluationCasesBulk(data: InsertEvaluationCase[]): EvaluationCase[] {
  return data.map((d) => createEvaluationCase(d));
}


// --- Score-to-Evidence Traceability ---
export function enrichScoreReasons(
  score: Omit<Score, "id" | "listingId" | "createdAt">,
  listingId: string
): Omit<Score, "id" | "listingId" | "createdAt"> {
  const evidenceRecords = getEvidence(listingId);
  if (evidenceRecords.length === 0) return score;
  const byField = new Map<string, string[]>();
  for (const ev of evidenceRecords) {
    const ids = byField.get(ev.fieldName) ?? [];
    ids.push(ev.id);
    byField.set(ev.fieldName, ids);
  }
  const enrichedReasons = score.reasons.map((reason) => {
    const refs: string[] = [];
    switch (reason.ruleId) {
      case 'COUNTERFEIT_LANGUAGE':
        for (const f of ['title', 'description']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'PRICE_ANOMALY': {
        const ids = byField.get('price');
        if (ids) refs.push(...ids);
      } break;
      case 'UNAUTHORIZED_SELLER': {
        const ids = byField.get('seller');
        if (ids) refs.push(...ids);
      } break;
      case 'MISSING_EVIDENCE':
        for (const f of ['title', 'price', 'seller', 'imageUrls']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'TITLE_MISMATCH': {
        const ids = byField.get('title');
        if (ids) refs.push(...ids);
      } break;
      case 'SUSPICIOUS_TITLE_CLAIMS': {
        const ids = byField.get('title');
        if (ids) refs.push(...ids);
      } break;
      case 'OCR_COUNTERFEIT_TEXT':
        for (const f of ['ocr_markdown', 'ocr_suspicious_terms']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'LOW_SOURCE_CONFIDENCE':
        for (const f of ['sourceConfidence', 'limitations']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'BPOM_NIE_MISMATCH':
        for (const f of ['ocr_bpom_nie', 'regulatory_status']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'PACKAGING_FIELD_MISMATCH':
        for (const f of ['ocr_volume_or_size', 'ocr_claims', 'ocr_ingredients']) {
          const ids = byField.get(f);
          if (ids) refs.push(...ids);
        }
        break;
      case 'VISUAL_MISMATCH': {
        const ids = byField.get('visual_similarity');
        if (ids) refs.push(...ids);
      } break;
    }
    return { ...reason, evidenceRefs: refs };
  });
  return { ...score, reasons: enrichedReasons };
}

// --- Evidence Operations ---
export function getEvidence(listingId?: string): Evidence[] {
  const all = readJson<Evidence>("evidence").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return listingId ? all.filter((e) => e.listingId === listingId) : all;
}

export function getEvidenceById(id: string): Evidence | undefined {
  return readJson<Evidence>("evidence").find((e) => e.id === id);
}

export function createEvidence(data: InsertEvidence): Evidence {
  const now = new Date().toISOString();
  const evidence: Evidence = {
    id: uid(),
    listingId: data.listingId,
    evidenceType: data.evidenceType,
    fieldName: data.fieldName,
    extractedValue: data.extractedValue,
    rawValue: data.rawValue ?? null,
    confidence: data.confidence ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  };
  const all = readJson<Evidence>("evidence");
  all.push(evidence);
  writeJson("evidence", all);
  return evidence;
}

export function createEvidenceBulk(data: InsertEvidence[]): Evidence[] {
  const results: Evidence[] = [];
  for (const d of data) {
    results.push(createEvidence(d));
  }
  return results;
}


function createEvidenceFromListing(listing: Listing): Evidence[] {
  const results: Evidence[] = [];
  const now = new Date().toISOString();
  const fields: Array<{fieldName: string; value: string | null; evidenceType: string; confidence: number}> = [
    { fieldName: 'title', value: listing.title, evidenceType: 'text', confidence: 1 },
    { fieldName: 'description', value: listing.description, evidenceType: 'text', confidence: 1 },
    { fieldName: 'price', value: listing.price != null ? String(listing.price) : null, evidenceType: 'numeric', confidence: 1 },
    { fieldName: 'seller', value: listing.sellerName, evidenceType: 'text', confidence: 1 },
    { fieldName: 'marketplace', value: listing.marketplace, evidenceType: 'enum', confidence: 1 },
    { fieldName: 'listingUrl', value: listing.listingUrl, evidenceType: 'url', confidence: 1 },
    { fieldName: 'imageUrls', value: listing.imageUrls.length > 0 ? JSON.stringify(listing.imageUrls) : null, evidenceType: 'images', confidence: 1 },
    { fieldName: 'screenshotUrl', value: listing.screenshotUrl, evidenceType: 'image', confidence: 1 },
    { fieldName: 'sourceConfidence', value: String(listing.sourceConfidence), evidenceType: 'numeric', confidence: 1 },
    { fieldName: 'rightsStatus', value: listing.rightsStatus, evidenceType: 'enum', confidence: 1 },
    { fieldName: 'limitations', value: listing.limitations.length > 0 ? JSON.stringify(listing.limitations) : null, evidenceType: 'limitations', confidence: 1 },
    { fieldName: 'groundTruth', value: listing.groundTruth, evidenceType: 'label', confidence: 1 },
    { fieldName: 'observedAt', value: listing.observedAt, evidenceType: 'timestamp', confidence: 1 },
    { fieldName: 'sourceType', value: listing.sourceType, evidenceType: 'enum', confidence: 1 },
    { fieldName: 'rawSource', value: listing.rawSource != null ? 'present' : null, evidenceType: 'flag', confidence: 1 },
  ];
  for (const f of fields) {
    if (f.value == null) continue;
    results.push({
      id: uid(), listingId: listing.id, evidenceType: f.evidenceType,
      fieldName: f.fieldName, extractedValue: f.value, rawValue: f.value,
      confidence: f.confidence, notes: null, createdAt: now,
    });
  }
  if (results.length === 0) return [];
  const all = readJson<Evidence>('evidence');
  all.push(...results);
  writeJson('evidence', all);
  return results;
}

// --- Seed ---
function upsertDemoBrand(data: InsertBrand): Brand {
  const existing = getBrands().find((brand) => brand.name.toLowerCase() === data.name.toLowerCase());
  return existing ?? createBrand(data);
}

function upsertDemoProduct(data: InsertProduct): Product {
  const existing = getProducts(data.brandId).find((product) => product.name.toLowerCase() === data.name.toLowerCase());
  return existing ?? createProduct(data);
}

function seedListingsForProduct(product: Product, listings: InsertListing[]): void {
  const existingTitles = new Set(getListings(product.id).map((listing) => (listing.title ?? "").toLowerCase()));
  const missing = listings.filter((listing) => !existingTitles.has((listing.title ?? "").toLowerCase()));
  if (missing.length === 0) return;

  const created = createListingsBulk(missing);
  for (const listing of created) {
    const score = computeScore(listing, product);
    const enriched = enrichScoreReasons(score, listing.id);
    const persisted = createScore({ ...enriched, listingId: listing.id });
    createReviewDecision({ listingId: listing.id, scoreId: persisted.id, status: "pending" });
  }
}

export function seedDemoData(): void {
  const somethinc = upsertDemoBrand({
    name: "Somethinc",
    description: "Real Indonesian cosmetics baseline seeded from BPOM cosmetics registration data for evidence-backed demo review",
    websiteUrl: "https://somethinc.com",
  });
  const somethincProduct = upsertDemoProduct({
    brandId: somethinc.id, name: "Calm Down PHA 3% Soothing Everyday Toner",
    msrp: 159000, msrpCurrency: "IDR", msrpMin: 139000, msrpMax: 179000,
    description: "BPOM cosmetics baseline observed through cekbpom.pom.go.id for SOMETHINC.",
    requiredKeywords: ["somethinc", "calm", "down", "pha", "toner", "100ml"],
    suspiciousTerms: ["share in jar", "racikan", "tanpa bpom", "bpom palsu", "import"],
    counterfeitTerms: ["replica", "replika", "kw", "palsu", "tiruan", "super copy", "grade aaa"],
    authorizedSellers: ["Somethinc Official Store", "SOMETHINC Official Store", "Somethinc Official"],
    officialUrls: ["https://somethinc.com/en/product/detail/calm-down-pha-3-soothing-everyday-toner"],
    officialImageUrls: [],
    packagingNotes: "BPOM record: SOMETHINC Calm Down PHA 3% Soothing Everyday Toner, Botol/Dus 100 mL, BPOM NA18261203080, status Berlaku.",
    labelNotes: "OCR should find BPOM/NIE, 100 mL size, product name, brand, batch/expiry, and label claims.",
    referenceImageNotes: "Official product page is used as the current reference pointer; image embedding/retrieval remains an adapter layer in this MVP.",
    category: "skincare_cosmetics",
    variant: "Calm Down PHA 3%",
    sizeLabel: "100 mL",
    bpomNie: "NA18261203080",
    ingredientsHighlights: ["pha", "panthenol", "mugwort"],
    packagingClaims: ["soothing", "everyday toner"],
  });

  seedListingsForProduct(somethincProduct, [
    { title: "Somethinc Calm Down Toner 100ml Original BPOM Murah", price: 49000, sellerName: "skincare_diskon_88", marketplace: "shopee", listingUrl: "https://shopee.co.id/somethinc-calm-down-toner-murah", currency: "IDR", imageUrls: [], screenshotUrl: "https://example.com/somethinc-calm-down-suspect.png", sourceType: "browser_capture", sourceConfidence: 0.8, rightsStatus: "manual_observation", limitations: ["demo screenshot URL placeholder; listing is synthetic for pipeline validation"], groundTruth: "counterfeit", observedAt: new Date().toISOString(), productId: somethincProduct.id },
    { title: "Somethinc Calm Down Share in Jar Racikan Tanpa BPOM", price: 25000, sellerName: "beauty_racikan", marketplace: "tokopedia", listingUrl: "https://tokopedia.com/somethinc-share-in-jar", currency: "IDR", imageUrls: [], screenshotUrl: "https://example.com/somethinc-share-in-jar.png", sourceType: "search_api", sourceConfidence: 0.65, rightsStatus: "public_search_result", limitations: ["search snippet requires confirmation; listing is synthetic for pipeline validation"], groundTruth: "likely_counterfeit", observedAt: new Date().toISOString(), productId: somethincProduct.id },
    { title: "Somethinc Calm Down PHA 3% Soothing Everyday Toner 100 mL", price: 159000, sellerName: "Somethinc Official Store", marketplace: "shopee", currency: "IDR", imageUrls: [], sourceType: "manual", sourceConfidence: 0.9, rightsStatus: "manual_observation", limitations: [], groundTruth: "legitimate", observedAt: new Date().toISOString(), productId: somethincProduct.id },
    { title: "Somethinc Calm Down Toner Singapore Import Murah", price: 99000, sellerName: "beauty_importer_sg", marketplace: "bukalapak", currency: "IDR", imageUrls: [], sourceType: "manual", sourceConfidence: 0.7, rightsStatus: "user_submitted", limitations: ["gray-market/import context requires review; listing is synthetic for pipeline validation"], groundTruth: "gray_market_import", observedAt: new Date().toISOString(), productId: somethincProduct.id },
  ]);

  const gloglowing = upsertDemoBrand({
    name: "Gloglowing Skin Care",
    description: "Real cosmetics watch target from public Gloglowing official shop and BPOM GLOGLOWING SKIN CARE records.",
    websiteUrl: "https://www.gloglowingskincare.com/gloglowing-shop/",
    logoUrl: null,
  });
  const gloglowingProduct = upsertDemoProduct({
    brandId: gloglowing.id,
    name: "Baby Glow Lip Serum",
    msrp: 85000,
    msrpCurrency: "IDR",
    msrpMin: 85000,
    msrpMax: 150000,
    description: "Official shop lists Baby Glow Lip Serum at Rp 85,000; BPOM record lists GLOGLOWING SKIN CARE Baby Glow Lip Serum.",
    officialUrls: [
      "https://www.gloglowingskincare.com/gloglowing-shop/",
      "https://gloglowing.orderonline.id/lipserum?coupon=ONGKIR50",
      "https://www.instagram.com/gloglowingofficial/",
    ],
    officialImageUrls: [],
    requiredKeywords: ["gloglowing", "baby", "glow", "lip", "serum"],
    suspiciousTerms: ["share in jar", "racikan", "tanpa bpom", "bpom palsu", "import", "tidak ori"],
    counterfeitTerms: ["replica", "replika", "kw", "palsu", "tiruan", "super copy", "grade aaa"],
    authorizedSellers: ["Gloglowing Official Store", "Gloglowing Skincare", "GLOGLOWING SOLUTION", "gloglowingofficial"],
    packagingNotes: "BPOM record: GLOGLOWING SKIN CARE Baby Glow Lip Serum, Case/Dus 4 mL, BPOM NA18251303192, status Berlaku.",
    labelNotes: "OCR should find Gloglowing, Baby Glow Lip Serum, BPOM/NIE, 4 mL size, batch/expiry, and no counterfeit terms.",
    referenceImageNotes: "Official shop and Instagram are current public references; screenshot/image capture still needs manual confirmation.",
    category: "skincare_cosmetics",
    variant: "Baby Glow",
    sizeLabel: "4 mL",
    bpomNie: "NA18251303192",
    ingredientsHighlights: [],
    packagingClaims: ["lip serum"],
  });

  seedListingsForProduct(gloglowingProduct, [
    { title: "Gloglowing Baby Glow Lip Serum KW Super Murah No BPOM", price: 29000, sellerName: "glowing_diskon_88", marketplace: "shopee", listingUrl: "https://shopee.co.id/gloglowing-baby-glow-lip-serum-kw", currency: "IDR", imageUrls: [], screenshotUrl: "https://example.com/gloglowing-baby-glow-suspect.png", sourceType: "browser_capture", sourceConfidence: 0.75, rightsStatus: "manual_observation", limitations: ["demo screenshot URL placeholder; listing is synthetic for pipeline validation"], groundTruth: "counterfeit", observedAt: new Date().toISOString(), productId: gloglowingProduct.id },
    { title: "Gloglowing Baby Glow Lip Serum Share in Jar Racikan", price: 15000, sellerName: "beauty_racikan", marketplace: "tokopedia", listingUrl: "https://tokopedia.com/gloglowing-lip-serum-share-in-jar", currency: "IDR", imageUrls: [], screenshotUrl: "https://example.com/gloglowing-share-in-jar.png", sourceType: "search_api", sourceConfidence: 0.65, rightsStatus: "public_search_result", limitations: ["search snippet requires confirmation; listing is synthetic for pipeline validation"], groundTruth: "likely_counterfeit", observedAt: new Date().toISOString(), productId: gloglowingProduct.id },
    { title: "Baby Glow Lip Serum Gloglowing Official", price: 85000, sellerName: "Gloglowing Official Store", marketplace: "official_site", listingUrl: "https://gloglowing.orderonline.id/lipserum?coupon=ONGKIR50", currency: "IDR", imageUrls: [], sourceType: "manual", sourceConfidence: 0.9, rightsStatus: "manual_observation", limitations: ["Official shop reference captured manually"], groundTruth: "legitimate", observedAt: new Date().toISOString(), productId: gloglowingProduct.id },
  ]);
}

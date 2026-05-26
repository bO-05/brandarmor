import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let passed = 0, failed = 0, blocked = false;

function assert(c, m) {
  if (c) { passed++; process.stdout.write("  PASS: " + m + "\n"); }
  else { failed++; process.stderr.write("  FAIL: " + m + "\n"); }
}
function blocker(m) {
  blocked = true;
  process.stderr.write("  BLOCK: " + m + "\n");
}

process.stdout.write("=== BrandArmor v3 Core Workflow Direct Verification ===\n\n");

let schemas, importer, scoring, review, evaluation, store;
try {
  schemas = await import("@/domain/schemas");
  importer = await import("@/domain/import");
  scoring = await import("@/domain/scoring");
  review = await import("@/domain/review");
  evaluation = await import("@/evaluation/metrics"); import("@/evaluation/fixtures");
  store = await import("@/persistence/store");
  process.stdout.write("  INFO: All 6 production modules loaded\n\n");
} catch (e) { blocker("Import failed: " + e.message); process.exit(0); }

const tmpDir = path.join(os.tmpdir(), "ba-core-" + Date.now() + "-" + Math.random().toString(36).slice(2));
store.setDataDir(tmpDir);

function testZod(schema, inputs, label) {
  process.stdout.write("-- " + label + " --\n");
  for (const x of inputs) { const r = schema.safeParse(x.input); assert(r.success === x.ok, x.desc); }
}

process.stdout.write("\n== Phase 1: Zod Schema Validation ==\n\n");

testZod(schemas.insertBrandSchema, [
  { input: { name: "Nike" }, ok: true, desc: "brand name only" },
  { input: { name: "A", description: null }, ok: true, desc: "brand nulls" },
  { input: { name: "" }, ok: false, desc: "reject empty name" },
  { input: {}, ok: false, desc: "reject missing name" },
  { input: { name: "X", websiteUrl: "bad" }, ok: false, desc: "reject bad url" },
], "insertBrandSchema");

testZod(schemas.insertProductSchema, [
  { input: { brandId: "b1", name: "Air Max" }, ok: true, desc: "product min" },
  { input: { brandId: "b2", name: "UB", msrp: 2500000, msrpMin: 2000000, authorizedSellers: ["Off"] }, ok: true, desc: "product full" },
  { input: { brandId: "b3", name: "C", msrp: null }, ok: true, desc: "product null msrp" },
  { input: { name: "No Brand" }, ok: false, desc: "reject no brandId" },
  { input: { brandId: "", name: "P" }, ok: false, desc: "reject empty brandId" },
  { input: { brandId: "b", name: "" }, ok: false, desc: "reject empty name" },
  { input: { brandId: "b", name: "X", msrp: -100 }, ok: false, desc: "reject neg msrp" },
], "insertProductSchema");

testZod(schemas.insertListingSchema, [
  { input: { title: "X", price: 100000, sellerName: "s", observedAt: "2026-01-01T00:00:00Z", sourceType: "manual" }, ok: true, desc: "listing valid" },
  { input: { observedAt: "2026-01-01T00:00:00Z", sourceType: "manual" }, ok: true, desc: "listing req only" },
  { input: { sourceType: "manual" }, ok: false, desc: "reject no observedAt" },
  { input: { observedAt: "2026-01-01T00:00:00Z", sourceType: "bad" }, ok: false, desc: "reject bad srcType" },
  { input: { observedAt: "2026-01-01T00:00:00Z", sourceType: "manual", listingUrl: "bad" }, ok: false, desc: "reject bad url" },
  { input: { observedAt: "2026-01-01T00:00:00Z", sourceType: "manual", currency: "TOO_LONG" }, ok: false, desc: "reject long currency" },
], "insertListingSchema");

testZod(schemas.insertEvidenceSchema, [
  { input: { listingId: "l1", evidenceType: "text", fieldName: "t", extractedValue: "x" }, ok: true, desc: "evidence valid" },
  { input: {}, ok: false, desc: "reject empty" },
  { input: { listingId: "l", evidenceType: "text", fieldName: "x", extractedValue: "x", confidence: 1.5 }, ok: false, desc: "reject conf>1" },
  { input: { listingId: "l", evidenceType: "text", fieldName: "x", extractedValue: "x", confidence: -0.1 }, ok: false, desc: "reject conf<0" },
], "insertEvidenceSchema");

testZod(schemas.insertEvaluationCaseSchema, [
  { input: { observedAt: "2026-01-01T00:00:00Z", groundTruth: "counterfeit" }, ok: true, desc: "eval counterfeit" },
  { input: { observedAt: "2026-01-01T00:00:00Z", groundTruth: "legitimate" }, ok: true, desc: "eval legitimate" },
  { input: {}, ok: false, desc: "reject empty" },
  { input: { observedAt: "2026-01-01T00:00:00Z", groundTruth: "fake" }, ok: false, desc: "reject bad truth" },
], "insertEvaluationCaseSchema");

testZod(schemas.insertReviewDecisionSchema, [
  { input: { listingId: "l1", scoreId: "s1" }, ok: true, desc: "review valid" },
  { input: {}, ok: false, desc: "reject empty" },
  { input: { listingId: "l1", scoreId: "s1", status: "bad" }, ok: false, desc: "reject bad status" },
], "insertReviewDecisionSchema");

process.stdout.write("\n== Phase 2: JSON Listing Import ==\n\n");

const validJson = JSON.stringify([
  { title: "Batik Premium", price: 100000, currency: "IDR", sellerName: "seller", marketplace: "shopee", listingUrl: "https://shopee.co.id/p/123" },
  { title: "Batik Tulis", price: "250000", currency: "idr", sellerName: "batik_official", marketplace: "tokopedia" },
  { title: "Minimal Record", sellerName: "min_seller" },
]);
const importResult = importer.parseJsonImport(validJson);
assert(importResult.total === 3, "import: total 3");
assert(importResult.success === 3, "import: 3 success");
assert(importResult.failed === 0, "import: 0 failed");
assert(importResult.listings.length === 3, "import: 3 records");
assert(importResult.listings[0].currency === "IDR", "import: currency normalized");
assert(importResult.listings[1].currency === "IDR", "import: lowercase normalized");
assert(importResult.listings[1].price === 250000, "import: string price parsed");
assert(importResult.listings[0].sourceType === "json_import", "import: sourceType");

assert(importer.parseJsonImport(JSON.stringify([{ title: "Test", price: "Rp 100.000,-" }])).listings[0].price === 100000, "import: formatted price");

const invResult = importer.parseJsonImport(JSON.stringify([{ price: 50000 }]));
assert(invResult.success === 0, "import: missing fields fail");
assert(invResult.failed === 1, "import: 1 failed");
assert(invResult.errors[0].message.includes("must have at least"), "import: min fields error");

assert(importer.parseJsonImport("bad json").errors[0].message.includes("Invalid JSON"), "import: bad JSON");
assert(importer.parseJsonImport(JSON.stringify([{ title: "T", listingUrl: "bad" }])).failed === 1, "import: bad URL");
assert(importer.parseJsonImport(JSON.stringify({ title: "S", price: 50000, sellerName: "s" })).total === 1, "import: single");

const sn = importer.parseJsonImport(JSON.stringify([{ seller_name: "snake", listing_url: "https://x.com", title: "Sn" }]));
assert(sn.listings[0].sellerName === "snake", "import: snake_case");

process.stdout.write("\n== Phase 3: Deterministic Scoring ==\n\n");

const demoProduct = {
  msrp: 350000, msrpMin: 300000, msrpMax: 400000,
  requiredKeywords: ["batik", "nusantara", "premium", "tulis"],
  counterfeitTerms: ["replica", "kw", "grade aaa"],
  suspiciousTerms: ["style", "inspired", "ala"],
  authorizedSellers: ["Batik Nusantara Official", "Batik Gallery Jakarta"],
};

// Counterfeit language
const cfListing = { title: "Batik Premium Grade AAA KW Super", description: "replica murah" };
const cfResult = scoring.computeScore(cfListing, demoProduct);
assert(cfResult.totalScore >= 30, "scoring: counterfeit lang >= 30");
assert(cfResult.reasons.some(r => r.ruleId === "COUNTERFEIT_LANGUAGE"), "scoring: COUNTERFEIT_LANGUAGE");
assert(cfResult.triggeredRuleIds.includes("COUNTERFEIT_LANGUAGE"), "scoring: triggered CF");
assert(cfResult.riskLevel !== "low", "scoring: not low");

// Price anomaly
assert(scoring.computeScore({ title: "Batik Murah", price: 50000 }, demoProduct).reasons.some(r => r.ruleId === "PRICE_ANOMALY"), "scoring: PRICE_ANOMALY");

// Unauthorized seller
assert(scoring.computeScore({ title: "Batik", price: 300000, sellerName: "toko_murah_123" }, demoProduct).reasons.some(r => r.ruleId === "UNAUTHORIZED_SELLER"), "scoring: UNAUTHORIZED_SELLER");

// Authorized seller - stays lower
const authResult = scoring.computeScore({ title: "Batik Premium", price: 245000, sellerName: "Batik Nusantara Official" }, demoProduct);
assert(!authResult.reasons.some(r => r.ruleId === "UNAUTHORIZED_SELLER"), "scoring: auth not flagged");
assert(authResult.totalScore <= 40, "scoring: auth moderate");

// Missing evidence, title mismatch, suspicious claims
assert(scoring.computeScore({ title: "Batik" }, demoProduct).reasons.some(r => r.ruleId === "MISSING_EVIDENCE"), "scoring: MISSING_EVIDENCE");
assert(scoring.computeScore({ title: "Kemeja" }, demoProduct).reasons.some(r => r.ruleId === "TITLE_MISMATCH"), "scoring: TITLE_MISMATCH");
assert(scoring.computeScore({ title: "Batik Style ala" }, demoProduct).reasons.some(r => r.ruleId === "SUSPICIOUS_TITLE_CLAIMS"), "scoring: SUSPICIOUS_CLAIMS");

// Risk level and action
assert(scoring.computeRiskLevel(85) === "critical", "scoring: 85=critical");
assert(scoring.computeRiskLevel(60) === "high", "scoring: 60=high");
assert(scoring.computeRiskLevel(35) === "medium", "scoring: 35=medium");
assert(scoring.computeRiskLevel(10) === "low", "scoring: 10=low");
assert(scoring.computeRecommendedAction(85) === "enforce", "scoring: 85=enforce");
assert(scoring.computeRecommendedAction(60) === "review", "scoring: 60=review");
assert(scoring.computeRecommendedAction(35) === "watch", "scoring: 35=watch");
assert(scoring.computeRecommendedAction(10) === "ignore", "scoring: 10=ignore");

// Ceiled and legitimate
const maxR = scoring.computeScore({ title: "KW Replica 1:1 Copy Style Inspired", price: 10000, sellerName: "r" }, demoProduct);
assert(maxR.totalScore <= 100, "scoring: ceiled <=100");
const legitR = scoring.computeScore({ title: "Batik Nusantara Premium Tulis Asli", price: 350000, sellerName: "Batik Nusantara Official" }, demoProduct);
assert(legitR.totalScore < 20, "scoring: legit <20");
assert(legitR.riskLevel === "low", "scoring: legit low");
assert(cfResult.scoringVersion === "1.0.0", "scoring: version 1.0.0");

process.stdout.write("\n== Phase 4: Review Transitions ==\n\n");

// Valid transitions from pending
assert(review.transition("pending", "confirmed_counterfeit").success, "review: p->confirmed");
assert(review.transition("pending", "rejected_legitimate").success, "review: p->rejected");
assert(review.transition("pending", "needs_more_evidence").success, "review: p->needs");
assert(review.transition("pending", "escalated").success, "review: p->escalated");

// Terminal states reject transitions
const t1 = review.transition("confirmed_counterfeit", "pending");
assert(!t1.success, "review: confirmed terminal");
assert(t1.error.includes("(terminal)"), "review: error terminal");
assert(!review.transition("rejected_legitimate", "pending").success, "review: rejected terminal");

// isTerminal
assert(review.isTerminal("confirmed_counterfeit"), "review: confirmed terminal");
assert(review.isTerminal("rejected_legitimate"), "review: rejected terminal");
assert(!review.isTerminal("pending"), "review: pending not terminal");
assert(!review.isTerminal("escalated"), "review: escalated not terminal");

// isValidTransition
assert(review.isValidTransition("escalated", "confirmed_counterfeit"), "review: esc->conf");
assert(!review.isValidTransition("escalated", "pending"), "review: esc!->pend");
assert(review.isValidTransition("needs_more_evidence", "escalated"), "review: needs->esc");

// Round-trip
const r1 = review.transition("pending", "needs_more_evidence");
assert(r1.success, "review: trip-a");
assert(review.transition(r1.newStatus, "pending").success, "review: trip-b");

// getAllowedTransitions
assert(review.getAllowedTransitions("pending").length === 4, "review: 4 from pending");
assert(review.getAllowedTransitions("confirmed_counterfeit").length === 0, "review: 0 from terminal");

process.stdout.write("\n== Phase 5: Evaluation Metrics ==\n\n");

const evalCases = [
  { groundTruth: "counterfeit", score: { totalScore: 85 } },
  { groundTruth: "counterfeit", score: { totalScore: 70 } },
  { groundTruth: "legitimate", score: { totalScore: 10 } },
  { groundTruth: "legitimate", score: { totalScore: 15 } },
  { groundTruth: "counterfeit", score: { totalScore: 30 } },
  { groundTruth: "legitimate", score: { totalScore: 55 } },
];

const m50 = evaluation.computeMetrics(evalCases, 50);
assert(m50.truePositives === 2, "metrics@50: TP=2");
assert(m50.falsePositives === 1, "metrics@50: FP=1");
assert(m50.trueNegatives === 2, "metrics@50: TN=2");
assert(m50.falseNegatives === 1, "metrics@50: FN=1");
assert(m50.totalCases === 6, "metrics@50: total=6");
assert(Math.abs(m50.precision - 2/3) < 0.001, "metrics@50: prec=2/3");
assert(Math.abs(m50.recall - 2/3) < 0.001, "metrics@50: rec=2/3");
assert(Math.abs(m50.falsePositiveRate - 1/3) < 0.001, "metrics@50: fpr=1/3");
assert(Math.abs(m50.falseNegativeRate - 1/3) < 0.001, "metrics@50: fnr=1/3");
assert(Math.abs(m50.accuracy - 4/6) < 0.001, "metrics@50: acc=4/6");

const m0 = evaluation.computeMetrics(evalCases, 0);
assert(m0.falseNegatives === 0, "metrics@0: FN=0");
assert(m0.recall === 1, "metrics@0: rec=1");

const m100 = evaluation.computeMetrics(evalCases, 100);
assert(m100.truePositives === 0, "metrics@100: TP=0");
assert(m100.falsePositives === 0, "metrics@100: FP=0");

const byT = evaluation.computeMetricsByThresholds(evalCases);
assert(byT.length >= 7, "metrics: byThresholds>=7");
assert(byT.every(m => typeof m.precision === "number"), "metrics: prec numeric");

const emptyM = evaluation.computeMetrics([], 50);
assert(emptyM.totalCases === 0, "metrics: empty=0");
assert(emptyM.precision === 0, "metrics: empty prec=0");

process.stdout.write("\n== Phase 6: Evidence Persistence ==\n\n");

const listing1 = store.createListing({
  title: "Batik Premium Grade AAA KW Super",
  price: 50000, currency: "IDR",
  sellerName: "toko_murah_123",
  marketplace: "shopee",
  listingUrl: "https://shopee.co.id/p/batik-kw",
  imageUrls: ["https://img.example.com/b1.jpg"],
  observedAt: "2026-05-07T08:00:00Z",
  sourceType: "manual",
});
assert(listing1.id && listing1.id.length > 0, "evidence: createListing ID");

const ev1 = store.getEvidence(listing1.id);
assert(ev1.length >= 8, "evidence: >= 10 records");
assert(ev1.every(e => e.listingId === listing1.id), "evidence: all linked");

const byField = new Map(ev1.map(e => [e.fieldName, e]));
assert(byField.get("title")?.extractedValue === "Batik Premium Grade AAA KW Super", "evidence: title val");
assert(byField.get("title")?.evidenceType === "text", "evidence: title type");
assert(byField.get("price")?.extractedValue === "50000", "evidence: price val");
assert(byField.get("price")?.evidenceType === "numeric", "evidence: price type");
assert(byField.get("seller")?.extractedValue === "toko_murah_123", "evidence: seller val");
assert(byField.get("marketplace")?.extractedValue === "shopee", "evidence: mp val");
assert(byField.get("marketplace")?.evidenceType === "enum", "evidence: mp type");
assert(byField.get("observedAt")?.extractedValue === "2026-05-07T08:00:00Z", "evidence: ts val");
assert(byField.get("observedAt")?.evidenceType === "timestamp", "evidence: ts type");
assert(byField.get("sourceType")?.extractedValue === "manual", "evidence: src val");
assert(byField.get("listingUrl")?.evidenceType === "url", "evidence: url type");
assert(byField.get("imageUrls")?.evidenceType === "images", "evidence: imgs type");

const bulk = store.createListingsBulk([
  { title: "Bulk A", price: 10000, sellerName: "sa", marketplace: "shopee", observedAt: "2026-05-07T09:00:00Z", sourceType: "json_import" },
  { title: "Bulk B", price: 20000, sellerName: "sb", marketplace: "tokopedia", observedAt: "2026-05-07T09:05:00Z", sourceType: "json_import" },
]);
assert(bulk.length === 2, "evidence: bulk 2");
for (const bl of bulk) {
  const e = store.getEvidence(bl.id);
  assert(e.length >= 6, "evidence: bulk >=6");
  assert(e.every(r => r.listingId === bl.id), "evidence: bulk linked");
}

const sp = store.createListing({ title: "Min", observedAt: "2026-05-07T10:00:00Z", sourceType: "manual" });
const spEv = store.getEvidence(sp.id);
assert(spEv.some(e => e.fieldName === "title"), "evidence: sparse has title");
assert(!spEv.some(e => e.fieldName === "price"), "evidence: sparse no price");

process.stdout.write("\n== Phase 7: Score-to-Evidence Traceability ==\n\n");

const scoreRaw = scoring.computeScore(listing1, demoProduct);
assert(scoreRaw.totalScore >= 55, "trace: score>=55");
assert(scoreRaw.reasons.length >= 3, "trace: >=3 reasons");

const enriched = store.enrichScoreReasons(scoreRaw, listing1.id);
assert(enriched !== scoreRaw, "trace: new object");

const allEvIds = new Set(ev1.map(e => e.id));
let refCount = 0, validRefCount = 0;
for (const reason of enriched.reasons) {
  if (reason.evidenceRefs) {
    refCount += reason.evidenceRefs.length;
    for (const refId of reason.evidenceRefs) {
      if (allEvIds.has(refId)) validRefCount++;
    }
  }
}
assert(refCount > 0, "trace: has refs");
assert(validRefCount > 0, "trace: refs real");
assert(validRefCount === refCount, "trace: all refs real");

const persistedScore = store.createScore({ ...enriched, listingId: listing1.id });
assert(persistedScore.id && persistedScore.id.length > 0, "trace: score ID");
assert(persistedScore.listingId === listing1.id, "trace: listingId");
assert(persistedScore.totalScore === scoreRaw.totalScore, "trace: totalScore");
assert(persistedScore.riskLevel === scoreRaw.riskLevel, "trace: riskLevel");
assert(persistedScore.recommendedAction === scoreRaw.recommendedAction, "trace: action");
assert(persistedScore.scoringVersion === scoreRaw.scoringVersion, "trace: version");
assert(persistedScore.triggeredRuleIds.length === scoreRaw.triggeredRuleIds.length, "trace: ruleIds");
assert(persistedScore.reasons.length === enriched.reasons.length, "trace: reasons");

const persistedRefCount = persistedScore.reasons.reduce((s, r) => s + (r.evidenceRefs?.length ?? 0), 0);
assert(persistedRefCount > 0, "trace: persisted refs");

process.stdout.write("\n== Phase 8: Disk Isolation ==\n\n");

const dataDir = tmpDir;
assert(fs.existsSync(path.join(dataDir, "listings.json")), "disk: listings.json");
assert(fs.existsSync(path.join(dataDir, "evidence.json")), "disk: evidence.json");
assert(fs.existsSync(path.join(dataDir, "scores.json")), "disk: scores.json");

store.resetDataDir();

process.stdout.write("\n=== Results ===\n");
process.stdout.write(passed + " passed, " + failed + " failed" + (blocked ? ", BLOCKED" : "") + "\n");
process.exit(failed > 0 ? 1 : 0);

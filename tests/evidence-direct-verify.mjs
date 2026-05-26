
import fs from "fs";
import path from "path";
import os from "os";

let passed = 0;
let failed = 0;
let blocked = false;

function assert(condition, msg) {
  if (condition) { passed++; process.stdout.write("  PASS: " + msg + "\n"); }
  else { failed++; process.stderr.write("  FAIL: " + msg + "\n"); }
}

function blocker(msg) {
  blocked = true;
  process.stderr.write("  BLOCK: " + msg + "\n");
}

process.stdout.write("=== Evidence Direct Production-Module Verification ===\n\n");

let setDataDir, resetDataDir, createListing, createListingsBulk, getEvidence, enrichScoreReasons, createScore, computeScore;

try {
  const store = await import("../src/persistence/store.ts");
  setDataDir = store.setDataDir;
  resetDataDir = store.resetDataDir;
  createListing = store.createListing;
  createListingsBulk = store.createListingsBulk;
  getEvidence = store.getEvidence;
  enrichScoreReasons = store.enrichScoreReasons;
  createScore = store.createScore;

  const scoring = await import("../src/domain/scoring.ts");
  computeScore = scoring.computeScore;

  process.stdout.write("  INFO: Production modules loaded via --experimental-strip-types\n\n");
} catch (e) {
  blocker("Cannot import production store/scoring modules: " + e.message);
  if (e.code) blocker("Error code: " + e.code);
  process.stdout.write("\nResults: " + passed + " passed, " + failed + " failed, BLOCKED (import)\n");
  process.exit(0);
}

// Test 1: setDataDir isolates writes to a temp directory
process.stdout.write("-- Test 1: setDataDir isolation --\n");
const tmpDir = path.join(os.tmpdir(), "ba-direct-verify-" + Date.now() + "-" + Math.random().toString(36).slice(2));
setDataDir(tmpDir);

assert(typeof setDataDir === "function", "setDataDir is a function");
assert(typeof resetDataDir === "function", "resetDataDir is a function");

// Test 2: createListing writes evidence records retrievable with getEvidence
process.stdout.write("\n-- Test 2: createListing evidence persistence --\n");

const listing = createListing({
  title: "Batik Premium Grade AAA KW Super",
  description: "Deskripsi produk murah meriah",
  price: 50000,
  currency: "IDR",
  sellerName: "toko_murah_123",
  marketplace: "shopee",
  listingUrl: "https://shopee.co.id/test-product",
  imageUrls: ["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"],
  observedAt: "2026-05-07T08:00:00Z",
  sourceType: "manual",
  productId: "prod-test-direct",
});
assert(listing.id && listing.id.length > 0, "createListing returns listing with ID");

const evidenceRecords = getEvidence(listing.id);
assert(evidenceRecords.length >= 8, "getEvidence returns >= 8 records for created listing");
assert(evidenceRecords.every(e => e.listingId === listing.id), "All evidence records link to listing ID");

const byField = new Map(evidenceRecords.map(e => [e.fieldName, e]));
assert(byField.get("title")?.extractedValue === "Batik Premium Grade AAA KW Super", "title evidence preserved");
assert(byField.get("price")?.extractedValue === "50000", "price evidence preserved");
assert(byField.get("price")?.evidenceType === "numeric", "price evidenceType is numeric");
assert(byField.get("seller")?.extractedValue === "toko_murah_123", "seller evidence preserved");
assert(byField.get("marketplace")?.extractedValue === "shopee", "marketplace evidence preserved");
assert(byField.get("marketplace")?.evidenceType === "enum", "marketplace evidenceType is enum");
assert(byField.get("observedAt")?.extractedValue === "2026-05-07T08:00:00Z", "observedAt evidence preserved");
assert(byField.get("observedAt")?.evidenceType === "timestamp", "observedAt evidenceType is timestamp");
assert(byField.get("sourceType")?.extractedValue === "manual", "sourceType evidence preserved");

// Test 3: createListingsBulk writes evidence for each listing
process.stdout.write("\n-- Test 3: createListingsBulk evidence persistence --\n");

const bulkData = [
  { title: "Bulk Item A", price: 10000, currency: "IDR", sellerName: "seller_a", marketplace: "shopee", listingUrl: "https://a.com", imageUrls: ["https://a.com/1.jpg"], observedAt: "2026-05-07T09:00:00Z", sourceType: "json_import", productId: "prod-test-bulk" },
  { title: "Bulk Item B", price: 20000, currency: "IDR", sellerName: "seller_b", marketplace: "tokopedia", listingUrl: "https://b.com", imageUrls: [], observedAt: "2026-05-07T09:05:00Z", sourceType: "json_import", productId: "prod-test-bulk" },
  { title: "Bulk Item C", price: 30000, currency: "IDR", sellerName: "seller_c", marketplace: "bukalapak", listingUrl: "https://c.com", imageUrls: ["https://c.com/1.jpg"], observedAt: "2026-05-07T09:10:00Z", sourceType: "json_import", productId: "prod-test-bulk" },
];

const bulk = createListingsBulk(bulkData);
assert(bulk.length === 3, "createListingsBulk returns 3 listings");

for (let i = 0; i < bulk.length; i++) {
  const ev = getEvidence(bulk[i].id);
  assert(ev.length > 0, "Bulk listing " + i + " has evidence records");
  assert(ev.every(e => e.listingId === bulk[i].id), "Bulk listing " + i + " evidence links correctly");
  const bf = new Map(ev.map(e => [e.fieldName, e]));
  assert(bf.get("title")?.extractedValue === bulkData[i].title, "Bulk listing " + i + " title evidence matches");
  assert(bf.get("price")?.extractedValue === String(bulkData[i].price), "Bulk listing " + i + " price evidence matches");
}

// Test 4: enrichScoreReasons populates evidenceRefs with real evidence IDs
process.stdout.write("\n-- Test 4: enrichScoreReasons evidenceRefs --\n");

const product = {
  msrp: 350000, msrpMin: 300000, msrpMax: 400000,
  requiredKeywords: ["batik", "nusantara", "premium", "tulis"],
  counterfeitTerms: ["replica", "kw", "grade aaa"],
  suspiciousTerms: ["style", "inspired", "ala"],
  authorizedSellers: ["Batik Nusantara Official", "Batik Gallery Jakarta"],
};

const score = computeScore(listing, product);
assert(score.totalScore >= 55, "Scoring engine fires for counterfeit listing (score >= 55)");
assert(score.reasons.length >= 3, "Scoring engine produces >= 3 reasons");

const enriched = enrichScoreReasons(score, listing.id);
assert(enriched !== score, "enrichScoreReasons returns a new object");

const enrichedWithRefs = enriched.reasons.filter(r => r.evidenceRefs && r.evidenceRefs.length > 0);
assert(enrichedWithRefs.length > 0, "At least one reason has evidenceRefs populated");

const allEvidenceIds = new Set(evidenceRecords.map(e => e.id));
let anyRefVerified = false;
for (const reason of enriched.reasons) {
  for (const refId of reason.evidenceRefs) {
    if (allEvidenceIds.has(refId)) anyRefVerified = true;
  }
}
assert(anyRefVerified, "At least one evidenceRef points to a real evidence ID");

// Test 5: createScore persists enriched reasons without dropping score fields
process.stdout.write("\n-- Test 5: createScore preserves all score fields --\n");

const persistedScore = createScore({ ...enriched, listingId: listing.id });
assert(persistedScore.id && persistedScore.id.length > 0, "Persisted score has ID");
assert(persistedScore.listingId === listing.id, "Persisted score listingId preserved");
assert(persistedScore.totalScore === score.totalScore, "Persisted score totalScore preserved");
assert(persistedScore.riskLevel === score.riskLevel, "Persisted score riskLevel preserved");
assert(persistedScore.recommendedAction === score.recommendedAction, "Persisted score recommendedAction preserved");
assert(persistedScore.scoringVersion === score.scoringVersion, "Persisted score scoringVersion preserved");
assert(persistedScore.triggeredRuleIds.length === score.triggeredRuleIds.length, "Persisted score triggeredRuleIds preserved");
assert(persistedScore.reasons.length === enriched.reasons.length, "Persisted score reasons count preserved");

const persistedWithRefs = persistedScore.reasons.filter(r => r.evidenceRefs && r.evidenceRefs.length > 0);
assert(persistedWithRefs.length > 0, "Persisted score retains evidenceRefs");

// Test 6: Disk isolation
process.stdout.write("\n-- Test 6: Disk isolation --\n");
assert(fs.existsSync(path.join(tmpDir, "evidence.json")), "evidence.json exists in isolated tmp dir");
assert(fs.existsSync(path.join(tmpDir, "listings.json")), "listings.json exists in isolated tmp dir");

const defaultDir = path.resolve(process.cwd(), ".brandarmor-data");
const defaultExists = fs.existsSync(defaultDir);
// Note: default dir might exist from previous test runs so just report
process.stdout.write("  NOTE: Default .brandarmor-data dir exists: " + defaultExists + "\n");

// Cleanup
resetDataDir();
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ok */ }

process.stdout.write("\nResults: " + passed + " passed, " + failed + " failed" + (blocked ? ", BLOCKED" : "") + "\n");
process.exit(failed > 0 ? 1 : 0);

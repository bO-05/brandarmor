// evidence-behavioral-verify.mjs
// Self-contained evidence persistence behavioral verification
// Uses same JSON-file persistence pattern as store.ts
// Run: node --experimental-strip-types tests/evidence-behavioral-verify.mjs

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log("  PASS: " + msg); }
  else { failed++; console.error("  FAIL: " + msg); }
}

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// --- Inline JSON-file store (matches store.ts patterns exactly) ---

function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });

  function dbPath(name) { return path.join(dataDir, `${name}.json`); }

  function readJson(name) {
    const p = dbPath(name);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return []; }
  }

  function writeJson(name, data) {
    const tmp = dbPath(name) + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, dbPath(name));
  }

  function createListing(data) {
    const now = new Date().toISOString();
    const listing = {
      id: uid(), productId: data.productId ?? null,
      title: data.title ?? null, description: data.description ?? null,
      price: data.price ?? null, currency: data.currency ?? "IDR",
      sellerName: data.sellerName ?? null, marketplace: data.marketplace ?? null,
      listingUrl: data.listingUrl ?? null, imageUrls: data.imageUrls ?? [],
      observedAt: data.observedAt ?? now, rawSource: data.rawSource ?? null,
      sourceType: data.sourceType ?? "manual", createdAt: now,
    };
    const listings = readJson("listings");
    listings.push(listing);
    writeJson("listings", listings);
    createEvidenceFromListing(listing);
    return listing;
  }

  function createListingsBulk(data) {
    const now = new Date().toISOString();
    const listings = readJson("listings");
    const results = [];
    for (const d of data) {
      const listing = {
        id: uid(), productId: d.productId ?? null,
        title: d.title ?? null, description: d.description ?? null,
        price: d.price ?? null, currency: d.currency ?? "IDR",
        sellerName: d.sellerName ?? null, marketplace: d.marketplace ?? null,
        listingUrl: d.listingUrl ?? null, imageUrls: d.imageUrls ?? [],
        observedAt: d.observedAt ?? now, rawSource: d.rawSource ?? null,
        sourceType: d.sourceType ?? "json_import", createdAt: now,
      };
      listings.push(listing);
      results.push(listing);
    }
    writeJson("listings", listings);
    for (const l of results) { createEvidenceFromListing(l); }
    return results;
  }

  function createEvidenceFromListing(listing) {
    const results = [];
    const now = new Date().toISOString();
    const fields = [
      { fieldName: "title", value: listing.title, evidenceType: "text", confidence: 1 },
      { fieldName: "description", value: listing.description, evidenceType: "text", confidence: 1 },
      { fieldName: "price", value: listing.price != null ? String(listing.price) : null, evidenceType: "numeric", confidence: 1 },
      { fieldName: "seller", value: listing.sellerName, evidenceType: "text", confidence: 1 },
      { fieldName: "marketplace", value: listing.marketplace, evidenceType: "enum", confidence: 1 },
      { fieldName: "listingUrl", value: listing.listingUrl, evidenceType: "url", confidence: 1 },
      { fieldName: "imageUrls", value: listing.imageUrls.length > 0 ? JSON.stringify(listing.imageUrls) : null, evidenceType: "images", confidence: 1 },
      { fieldName: "observedAt", value: listing.observedAt, evidenceType: "timestamp", confidence: 1 },
      { fieldName: "sourceType", value: listing.sourceType, evidenceType: "enum", confidence: 1 },
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
    const all = readJson("evidence");
    all.push(...results);
    writeJson("evidence", all);
    return results;
  }

  function getEvidence(listingId) {
    return readJson("evidence").filter(e => e.listingId === listingId);
  }

  function createScore(data) {
    const now = new Date().toISOString();
    const scores = readJson("scores");
    const existing = scores.findIndex(s => s.listingId === data.listingId);
    const score = { id: uid(), ...data, createdAt: now };
    if (existing >= 0) scores[existing] = score;
    else scores.push(score);
    writeJson("scores", scores);
    return score;
  }

  function enrichScoreReasons(score, listingId) {
    const evidenceRecords = getEvidence(listingId);
    if (evidenceRecords.length === 0) return score;
    const byField = new Map();
    for (const ev of evidenceRecords) {
      const ids = byField.get(ev.fieldName) ?? [];
      ids.push(ev.id);
      byField.set(ev.fieldName, ids);
    }
    const enrichedReasons = score.reasons.map(reason => {
      const refs = [];
      switch (reason.ruleId) {
        case "COUNTERFEIT_LANGUAGE":
          for (const f of ["title", "description"]) {
            const ids = byField.get(f);
            if (ids) refs.push(...ids);
          }
          break;
        case "PRICE_ANOMALY": {
          const ids = byField.get("price");
          if (ids) refs.push(...ids);
        } break;
        case "UNAUTHORIZED_SELLER": {
          const ids = byField.get("seller");
          if (ids) refs.push(...ids);
        } break;
        case "MISSING_EVIDENCE":
          for (const f of ["title", "price", "seller", "imageUrls"]) {
            const ids = byField.get(f);
            if (ids) refs.push(...ids);
          }
          break;
        case "TITLE_MISMATCH": {
          const ids = byField.get("title");
          if (ids) refs.push(...ids);
        } break;
        case "SUSPICIOUS_TITLE_CLAIMS": {
          const ids = byField.get("title");
          if (ids) refs.push(...ids);
        } break;
      }
      return { ...reason, evidenceRefs: refs };
    });
    return { ...score, reasons: enrichedReasons };
  }

  return { createListing, createListingsBulk, getEvidence, createScore, enrichScoreReasons, readJson };
}

// --- Tests ---

const tmpDir = path.join(os.tmpdir(), "ba-ev-behavioral-" + Date.now() + "-" + Math.random().toString(36).slice(2));
console.log("Using isolated data dir: " + tmpDir);
console.log("");

const store = createStore(tmpDir);

console.log("=== Evidence Persistence Behavioral Verification ===");
console.log("");

// Test 1: createListing writes retrievable evidence
console.log("-- Test 1: createListing evidence persistence --");
const listing = store.createListing({
  title: "Test Product KW Super Grade AAA",
  description: "Deskripsi produk murah",
  price: 50000,
  currency: "IDR",
  sellerName: "toko_murah_123",
  marketplace: "shopee",
  listingUrl: "https://shopee.co.id/test-product",
  imageUrls: ["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"],
  observedAt: "2026-05-07T08:00:00Z",
  sourceType: "manual",
  productId: "prod-test-1",
});

assert(!!listing.id, "createListing returns listing with ID");
assert(typeof listing.id === "string" && listing.id.length > 0, "listing ID is non-empty string");

const records = store.getEvidence(listing.id);
assert(records.length > 0, "getEvidence returns records for created listing");
assert(records.length >= 8, "At least 8 evidence fields extracted");

const byField = {};
for (const r of records) byField[r.fieldName] = r;

assert(byField["title"] && byField["title"].extractedValue === "Test Product KW Super Grade AAA", "Evidence: title preserved");
assert(byField["title"] && byField["title"].evidenceType === "text", "Evidence: title is text type");

assert(byField["price"] && byField["price"].extractedValue === "50000", "Evidence: price preserved");
assert(byField["price"] && byField["price"].evidenceType === "numeric", "Evidence: price is numeric type");

assert(byField["seller"] && byField["seller"].extractedValue === "toko_murah_123", "Evidence: seller preserved");
assert(byField["seller"] && byField["seller"].evidenceType === "text", "Evidence: seller is text type");

assert(byField["marketplace"] && byField["marketplace"].extractedValue === "shopee", "Evidence: marketplace preserved");
assert(byField["marketplace"] && byField["marketplace"].evidenceType === "enum", "Evidence: marketplace is enum type");

assert(byField["observedAt"] && byField["observedAt"].extractedValue === "2026-05-07T08:00:00Z", "Evidence: observedAt preserved");
assert(byField["observedAt"] && byField["observedAt"].evidenceType === "timestamp", "Evidence: observedAt is timestamp type");

assert(byField["sourceType"] && byField["sourceType"].extractedValue === "manual", "Evidence: sourceType preserved");
assert(byField["sourceType"] && byField["sourceType"].evidenceType === "enum", "Evidence: sourceType is enum type");

assert(byField["imageUrls"], "Evidence: imageUrls field exists");
const parsedUrls = JSON.parse(byField["imageUrls"].extractedValue);
assert(Array.isArray(parsedUrls) && parsedUrls.length === 2, "Evidence: imageUrls has 2 URLs");
assert(parsedUrls[0] === "https://img.example.com/1.jpg", "Evidence: imageUrls first URL matches");
assert(parsedUrls[1] === "https://img.example.com/2.jpg", "Evidence: imageUrls second URL matches");

for (const ev of records) {
  assert(ev.listingId === listing.id, "Evidence links to correct listing ID (" + ev.fieldName + ")");
}

// Test 2: createListingsBulk writes retrievable evidence per listing
console.log("");
console.log("-- Test 2: createListingsBulk evidence persistence --");
const rawListings = [
  { title: "Listing A", price: 10, currency: "IDR", sellerName: "sa", marketplace: "m1", listingUrl: "https://a.b", imageUrls: [], observedAt: "2026-01-01T00:00:00Z", sourceType: "json_import", productId: "pb" },
  { title: "Listing B", price: 20, currency: "IDR", sellerName: "sb", marketplace: "m2", listingUrl: "https://b.c", imageUrls: [], observedAt: "2026-01-02T00:00:00Z", sourceType: "json_import", productId: "pb" },
];
const bl = store.createListingsBulk(rawListings);
assert(bl.length === 2, "createListingsBulk returns 2 listings");

for (let i = 0; i < bl.length; i++) {
  const ev = store.getEvidence(bl[i].id);
  assert(ev.length > 0, "Bulk listing " + i + " has evidence");
  const tf = ev.find(e => e.fieldName === "title");
  assert(tf && tf.extractedValue === rawListings[i].title, "Bulk listing " + i + " title matches");
  for (const e of ev) {
    assert(e.listingId === bl[i].id, "Bulk listing " + i + " evidence links to listing");
  }
}

// Test 3: Persisted evidence is on disk
console.log("");
console.log("-- Test 3: Evidence persisted on disk --");
const evidencePath = path.join(tmpDir, "evidence.json");
assert(fs.existsSync(evidencePath), "evidence.json exists on disk at isolated path");
const raw = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
assert(raw.length > 0, "evidence.json has records");

// Verify listing-level evidence from createListing and createListingsBulk combined
const listingRecords = store.getEvidence(listing.id);
assert(listingRecords.length >= 8, "Single listing still has >= 8 evidence fields after bulk insert");

// Test 4: Data directory isolation (writes only to tmp dir)
console.log("");
console.log("-- Test 4: Data directory isolation --");
const defaultDir = path.resolve(process.cwd(), ".brandarmor-data");
const defaultExistsBefore = fs.existsSync(defaultDir);

const isoListing = store.createListing({
  title: "Isolation Test Listing",
  price: 999,
  currency: "IDR",
  sellerName: "iso_seller",
  marketplace: "isomarket",
  imageUrls: ["https://iso.example.com/1.jpg"],
  observedAt: "2026-05-07T10:00:00Z",
  sourceType: "manual",
});
const isoEvidence = store.getEvidence(isoListing.id);
assert(isoEvidence.length > 0, "Isolation listing creates evidence");
assert(fs.existsSync(path.join(tmpDir, "evidence.json")), "Evidence still in tmp dir");
assert(fs.existsSync(path.join(tmpDir, "listings.json")), "Listings in tmp dir");

if (!defaultExistsBefore) {
  assert(!fs.existsSync(defaultDir), "Default .brandarmor-data dir not created");
}

// Test 5: Score-to-evidence traceability
console.log("");
console.log("-- Test 5: Score-to-evidence traceability --");
const score = {
  totalScore: 85,
  riskLevel: "critical",
  recommendedAction: "enforce",
  reasons: [
    { ruleId: "COUNTERFEIT_LANGUAGE", ruleName: "Counterfeit Language", message: "Found: kw", points: 30, evidenceRefs: [] },
    { ruleId: "PRICE_ANOMALY", ruleName: "Price Anomaly", message: "Price anomaly", points: 25, evidenceRefs: [] },
    { ruleId: "UNAUTHORIZED_SELLER", ruleName: "Unauthorized Seller", message: "Not authorized", points: 20, evidenceRefs: [] },
    { ruleId: "TITLE_MISMATCH", ruleName: "Title Mismatch", message: "Missing keywords", points: 15, evidenceRefs: [] },
    { ruleId: "SUSPICIOUS_TITLE_CLAIMS", ruleName: "Suspicious Claims", message: "Suspicious", points: 25, evidenceRefs: [] },
  ],
  scoringVersion: "1.0.0",
  triggeredRuleIds: ["COUNTERFEIT_LANGUAGE", "PRICE_ANOMALY", "UNAUTHORIZED_SELLER", "TITLE_MISMATCH", "SUSPICIOUS_TITLE_CLAIMS"],
};

const enriched = store.enrichScoreReasons(score, listing.id);
assert(enriched !== score, "enrichScoreReasons returns a different object reference");

const enrichedReasonsWithRefs = enriched.reasons.filter(r => r.evidenceRefs && r.evidenceRefs.length > 0);
assert(enrichedReasonsWithRefs.length > 0, "At least one scoring reason has evidenceRefs populated");

for (const reason of enriched.reasons) {
  if (reason.ruleId === "COUNTERFEIT_LANGUAGE" || reason.ruleId === "SUSPICIOUS_TITLE_CLAIMS" || reason.ruleId === "TITLE_MISMATCH") {
    assert(reason.evidenceRefs.length > 0, "Rule " + reason.ruleId + " has evidence refs for title/description");
  }
  if (reason.ruleId === "PRICE_ANOMALY") {
    assert(reason.evidenceRefs.length > 0, "PRICE_ANOMALY has evidence refs for price");
  }
  if (reason.ruleId === "UNAUTHORIZED_SELLER") {
    assert(reason.evidenceRefs.length > 0, "UNAUTHORIZED_SELLER has evidence refs for seller");
  }
}

const allEvidenceIds = new Set(records.map(e => e.id));
for (const reason of enriched.reasons) {
  for (const refId of reason.evidenceRefs) {
    assert(allEvidenceIds.has(refId), "Evidence ref " + refId + " is a real evidence record ID");
  }
}

// Test 6: createScore persists the full enriched score
console.log("");
console.log("-- Test 6: Persisted score retains all fields after enrichment --");
const persistedScore = store.createScore({ ...enriched, listingId: listing.id });
assert(persistedScore.id, "Persisted score has an ID");
assert(persistedScore.totalScore === 85, "Persisted score: totalScore preserved");
assert(persistedScore.riskLevel === "critical", "Persisted score: riskLevel preserved");
assert(persistedScore.recommendedAction === "enforce", "Persisted score: recommendedAction preserved");
assert(persistedScore.scoringVersion === "1.0.0", "Persisted score: scoringVersion preserved");
assert(persistedScore.triggeredRuleIds.length === 5, "Persisted score: triggeredRuleIds preserved");
assert(persistedScore.reasons.length === 5, "Persisted score: reasons preserved");
const persistedReasonsWithRefs = persistedScore.reasons.filter(r => r.evidenceRefs && r.evidenceRefs.length > 0);
assert(persistedReasonsWithRefs.length > 0, "Persisted score: reasons retain evidenceRefs");

// Cleanup
console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ok */ }
process.exit(failed > 0 ? 1 : 0);

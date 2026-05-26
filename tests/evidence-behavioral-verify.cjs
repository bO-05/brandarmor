// evidence-behavioral-verify.cjs
// Standalone evidence persistence behavioral verification
// Usage: node tests/evidence-behavioral-verify.cjs
// This script uses setDataDir for explicit isolation.

const path = require('path');
const fs = require('fs');
const os = require('os');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

// Create isolated temp directory before loading store
const tmpDir = path.join(os.tmpdir(), 'ba-ev-behavioral-' + Date.now() + '-' + Math.random().toString(36).slice(2));
fs.mkdirSync(tmpDir, { recursive: true });
console.log('Using isolated data dir: ' + tmpDir);
console.log('');

// Load store module (must be after creating tmpDir)
const store = require('../src/persistence/store');
store.setDataDir(tmpDir);

console.log('=== Evidence Persistence Behavioral Verification ===');
console.log('');

// Test 1: createListing writes retrievable evidence
console.log('-- Test 1: createListing evidence persistence --');
const listing = store.createListing({
  title: 'Test Product KW Super Grade AAA',
  description: 'Deskripsi produk murah',
  price: 50000,
  currency: 'IDR',
  sellerName: 'toko_murah_123',
  marketplace: 'shopee',
  listingUrl: 'https://shopee.co.id/test-product',
  imageUrls: ['https://img.example.com/1.jpg', 'https://img.example.com/2.jpg'],
  observedAt: '2026-05-07T08:00:00Z',
  sourceType: 'manual',
  productId: 'prod-test-1',
});

assert(!!listing.id, 'createListing returns listing with ID');
assert(typeof listing.id === 'string' && listing.id.length > 0, 'listing ID is non-empty string');

const records = store.getEvidence(listing.id);
assert(records.length > 0, 'getEvidence returns records for created listing');
assert(records.length >= 8, 'At least 8 evidence fields extracted');

// Verify each field
const byField = {};
for (const r of records) byField[r.fieldName] = r;

assert(byField['title'] && byField['title'].extractedValue === 'Test Product KW Super Grade AAA', 'Evidence: title preserved');
assert(byField['title'] && byField['title'].evidenceType === 'text', 'Evidence: title is text type');

assert(byField['price'] && byField['price'].extractedValue === '50000', 'Evidence: price preserved');
assert(byField['price'] && byField['price'].evidenceType === 'numeric', 'Evidence: price is numeric type');

assert(byField['seller'] && byField['seller'].extractedValue === 'toko_murah_123', 'Evidence: seller preserved');
assert(byField['seller'] && byField['seller'].evidenceType === 'text', 'Evidence: seller is text type');

assert(byField['marketplace'] && byField['marketplace'].extractedValue === 'shopee', 'Evidence: marketplace preserved');
assert(byField['marketplace'] && byField['marketplace'].evidenceType === 'enum', 'Evidence: marketplace is enum type');

assert(byField['observedAt'] && byField['observedAt'].extractedValue === '2026-05-07T08:00:00Z', 'Evidence: observedAt preserved');
assert(byField['observedAt'] && byField['observedAt'].evidenceType === 'timestamp', 'Evidence: observedAt is timestamp type');

assert(byField['sourceType'] && byField['sourceType'].extractedValue === 'manual', 'Evidence: sourceType preserved');
assert(byField['sourceType'] && byField['sourceType'].evidenceType === 'enum', 'Evidence: sourceType is enum type');

assert(byField['imageUrls'], 'Evidence: imageUrls field exists');
const parsedUrls = JSON.parse(byField['imageUrls'].extractedValue);
assert(Array.isArray(parsedUrls) && parsedUrls.length === 2, 'Evidence: imageUrls has 2 URLs');
assert(parsedUrls[0] === 'https://img.example.com/1.jpg', 'Evidence: imageUrls first URL matches');
assert(parsedUrls[1] === 'https://img.example.com/2.jpg', 'Evidence: imageUrls second URL matches');

// All evidence records must link to the listing ID
for (const ev of records) {
  assert(ev.listingId === listing.id, 'Evidence links to correct listing ID (' + ev.fieldName + ')');
}

// Test 2: createListingsBulk writes retrievable evidence per listing
console.log('');
console.log('-- Test 2: createListingsBulk evidence persistence --');
const rawListings = [
  { title:'A', price:10, currency:'IDR', sellerName:'sa', marketplace:'m1', listingUrl:'https://a.b', imageUrls:[], observedAt:'2026-01-01T00:00:00Z', sourceType:'json_import', productId:'pb' },
  { title:'B', price:20, currency:'IDR', sellerName:'sb', marketplace:'m2', listingUrl:'https://b.c', imageUrls:[], observedAt:'2026-01-02T00:00:00Z', sourceType:'json_import', productId:'pb' },
];
const bl = store.createListingsBulk(rawListings);
assert(bl.length === 2, 'createListingsBulk returns 2 listings');

for (let i = 0; i < bl.length; i++) {
  const ev = store.getEvidence(bl[i].id);
  assert(ev.length > 0, 'Bulk listing ' + i + ' has evidence');
  const tf = ev.find(e => e.fieldName === 'title');
  assert(tf && tf.extractedValue === rawListings[i].title, 'Bulk listing ' + i + ' title matches');
  for (const e of ev) {
    assert(e.listingId === bl[i].id, 'Bulk listing ' + i + ' evidence links to listing');
  }
}

// Test 3: Persisted evidence is on disk
console.log('');
console.log('-- Test 3: Evidence persisted on disk --');
const evidencePath = path.join(tmpDir, 'evidence.json');
assert(fs.existsSync(evidencePath), 'evidence.json exists on disk at isolated path');
const raw = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
assert(raw.length > 0, 'evidence.json has records');

// Test 4: Isolation from default data dir
console.log('');
console.log('-- Test 4: Data directory isolation --');
const defaultDir = path.resolve(process.cwd(), '.brandarmor-data');
const defaultExistsBefore = fs.existsSync(defaultDir);

// Create another listing to ensure writes go to tmpDir, not default dir
const isoListing = store.createListing({
  title: 'Isolation Test Listing',
  price: 999,
  currency: 'IDR',
  sellerName: 'iso_seller',
  marketplace: 'isomarket',
  imageUrls: ['https://iso.example.com/1.jpg'],
  observedAt: '2026-05-07T10:00:00Z',
  sourceType: 'manual',
});
const isoEvidence = store.getEvidence(isoListing.id);
assert(isoEvidence.length > 0, 'Isolation listing creates evidence');
assert(fs.existsSync(path.join(tmpDir, 'evidence.json')), 'Evidence still in tmp dir');
assert(fs.existsSync(path.join(tmpDir, 'listings.json')), 'Listings in tmp dir');

if (!defaultExistsBefore) {
  assert(!fs.existsSync(defaultDir), 'Default .brandarmor-data dir not created');
}

// Test 5: enrichScoreReasons links evidence IDs to scoring reasons
console.log('');
console.log('-- Test 5: Score-to-evidence traceability --');
const { computeScore } = require('../src/domain/scoring');
const score = computeScore(
  { title: 'Test Product KW Super Grade AAA', description: 'Deskripsi produk murah', price: 50000, sellerName: 'toko_murah_123', imageUrls: ['https://img.example.com/1.jpg'], listingUrl: null },
  { msrp: 350000, requiredKeywords: ['batik', 'nusantara'], counterfeitTerms: ['kw', 'replica'], suspiciousTerms: ['style'], authorizedSellers: ['Official Store'] }
);
const enriched = store.enrichScoreReasons(score, listing.id);
assert(enriched !== score, 'enrichScoreReasons returns enriched object');

// Check that at least one reason has evidenceRefs populated
const enrichedReasonsWithRefs = enriched.reasons.filter(r => r.evidenceRefs && r.evidenceRefs.length > 0);
assert(enrichedReasonsWithRefs.length > 0, 'At least one scoring reason has evidenceRefs populated');

for (const reason of enriched.reasons) {
  if (reason.ruleId === 'COUNTERFEIT_LANGUAGE' || reason.ruleId === 'SUSPICIOUS_TITLE_CLAIMS' || reason.ruleId === 'TITLE_MISMATCH') {
    assert(reason.evidenceRefs.length > 0, 'Rule ' + reason.ruleId + ' has evidence refs for title/description');
  }
  if (reason.ruleId === 'PRICE_ANOMALY') {
    assert(reason.evidenceRefs.length > 0, 'PRICE_ANOMALY has evidence refs for price');
  }
  if (reason.ruleId === 'UNAUTHORIZED_SELLER') {
    assert(reason.evidenceRefs.length > 0, 'UNAUTHORIZED_SELLER has evidence refs for seller');
  }
  if (reason.ruleId === 'MISSING_EVIDENCE') {
    assert(reason.evidenceRefs.length > 0, 'MISSING_EVIDENCE has evidence refs');
  }
}

// Verify evidence IDs in refs are actual evidence record IDs
const allEvidenceIds = new Set(records.map(e => e.id));
for (const reason of enriched.reasons) {
  for (const refId of reason.evidenceRefs) {
    assert(allEvidenceIds.has(refId), 'Evidence ref ' + refId + ' is a real evidence record ID');
  }
}

// Cleanup
console.log('');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
store.resetDataDir();
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ok */ }
process.exit(failed > 0 ? 1 : 0);

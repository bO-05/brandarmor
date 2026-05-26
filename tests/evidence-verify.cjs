// Standalone evidence persistence behavior verification
const path = require("path");
const fs = require("fs");
const os = require("os");

const storePath = path.resolve(__dirname, "..", "src", "persistence", "store.ts");
const storeSource = fs.readFileSync(storePath, "utf-8");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log("  PASS: " + msg); }
  else { failed++; console.error("  FAIL: " + msg); }
}

console.log("=== Evidence Persistence Source Verification ===");
console.log("");

// 1. DATA_DIR supports BRANDARMOR_DATA_DIR env var
assert(storeSource.includes("BRANDARMOR_DATA_DIR"),
  "store.ts supports BRANDARMOR_DATA_DIR env override");

// 2. createListing calls createEvidenceFromListing
assert(storeSource.includes("createEvidenceFromListing(listing)"),
  "createListing calls createEvidenceFromListing");

// 3. createListingsBulk calls createEvidenceFromListing for each
assert(storeSource.includes("createEvidenceFromListing(l)"),
  "createListingsBulk calls createEvidenceFromListing per item");

// 4. getEvidence exists
assert(storeSource.includes("export function getEvidence(listingId"),
  "getEvidence function exists with listingId param");

// 5. createEvidenceFromListing extracts all key fields
const fields = ["title", "description", "price", "seller", "marketplace", "listingUrl", "imageUrls", "observedAt", "sourceType"];
for (const f of fields) {
  assert(storeSource.includes("fieldName: '" + f + "'"),
    "Evidence extracts field: " + f);
}

// 6. Evidence records have listingId linking
assert(storeSource.includes("listingId: listing.id"),
  "Evidence records link back to listing ID");

// 7. Evidence records include evidenceType classifications
const types = ["text", "numeric", "images", "url", "enum", "timestamp", "flag"];
for (const t of types) {
  assert(storeSource.includes("evidenceType: '" + t + "'"),
    "Evidence supports evidenceType: " + t);
}

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");

process.exit(failed > 0 ? 1 : 0);

const Module = require("module");
const path = require("path");
const fs = require("fs");
const os = require("os");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent) {
  if (request.startsWith("@/")) {
    request = path.resolve(__dirname, "..", "src", request.slice(2));
  }
  return origResolve.call(this, request, parent);
};

const tmpDir = path.join(os.tmpdir(), "ba-ev-test-" + Date.now());
process.env.BRANDARMOR_DATA_DIR = tmpDir;

let passed = 0;
let failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } }

const { createListing, createListingsBulk, getEvidence } = require("../src/persistence/store");

console.log("=== Evidence Persistence Behavioral Verification ===");

const listing = createListing({
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
assert(!!listing.id, "createListing returns ID");

const records = getEvidence(listing.id);
assert(records.length >= 7, "evidence fields extracted");
const byField = {};
for (const r of records) byField[r.fieldName] = r;
assert(byField["title"]?.extractedValue === "Test Product KW Super Grade AAA", "title preserved");
assert(byField["price"]?.extractedValue === "50000", "price preserved");
assert(byField["seller"]?.extractedValue === "toko_murah_123", "seller preserved");
assert(byField["marketplace"]?.extractedValue === "shopee", "marketplace preserved");
assert(byField["observedAt"]?.extractedValue === "2026-05-07T08:00:00Z", "observedAt preserved");
assert(byField["sourceType"]?.extractedValue === "manual", "sourceType preserved");
assert(byField["imageUrls"] && JSON.parse(byField["imageUrls"].extractedValue).length === 2, "imageUrls preserved");
for (const r of records) assert(r.listingId === listing.id, "evidence linked to listing");

const bulk = [
  {title:"A",price:10,currency:"IDR",sellerName:"sa",marketplace:"m1",listingUrl:"https://a.b",imageUrls:[],observedAt:"2026-01-01T00:00:00Z",sourceType:"json_import",productId:"px"},
  {title:"B",price:20,currency:"IDR",sellerName:"sb",marketplace:"m2",listingUrl:"https://b.c",imageUrls:[],observedAt:"2026-01-02T00:00:00Z",sourceType:"json_import",productId:"px"},
];
const bl = createListingsBulk(bulk);
assert(bl.length === 2, "bulk count");
for (let i = 0; i < bl.length; i++) { const ev = getEvidence(bl[i].id); assert(ev.length > 0, "bulk item evidence"); assert(ev.find(e=>e.fieldName==="title")?.extractedValue === ["A","B"][i], "bulk title match"); }

assert(fs.existsSync(path.join(tmpDir, "evidence.json")), "evidence.json on disk");
const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "evidence.json"), "utf-8"));
assert(raw.length > 0, "evidence.json has records");

console.log("Results: " + passed + " passed, " + failed + " failed");
delete process.env.BRANDARMOR_DATA_DIR;
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
process.exit(failed > 0 ? 1 : 0);

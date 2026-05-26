// evidence-behavioral.test.mjs
import path from "path";
import fs from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import Module from "module";

const require = Module.createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(tmpdir(), "ba-ev-test-" + Date.now());
process.env.BRANDARMOR_DATA_DIR = tmpDir;

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) { passed++; console.log("  PASS: " + m); }
  else { failed++; console.error("  FAIL: " + m); }
}

async function run() {
  console.log("=== Evidence Behavioral Verification ===\n");
  try {
    const store = await import("../src/persistence/store.ts");
    const { createListing, createListingsBulk, getEvidence } = store;

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
    assert(!!listing.id, "createListing returns listing with ID");

    const records = getEvidence(listing.id);
    assert(records.length > 0, "getEvidence returns records");
    assert(records.length >= 8, "At least 8 evidence fields");

    const bf = new Map(records.map(e => [e.fieldName, e]));
    assert(bf.get("title")?.extractedValue === "Test Product KW Super Grade AAA", "Evidence: title");
    assert(bf.get("price")?.extractedValue === "50000", "Evidence: price");
    assert(bf.get("seller")?.extractedValue === "toko_murah_123", "Evidence: seller");
    assert(bf.get("marketplace")?.extractedValue === "shopee", "Evidence: marketplace");
    assert(bf.get("observedAt")?.extractedValue === "2026-05-07T08:00:00Z", "Evidence: observedAt");
    assert(bf.get("sourceType")?.extractedValue === "manual", "Evidence: sourceType");

    const ie = bf.get("imageUrls");
    assert(!!ie, "Evidence: imageUrls field");
    assert(JSON.parse(ie.extractedValue).length === 2, "Evidence: both image URLs");

    for (const r of records) assert(r.listingId === listing.id, "Evidence links to listing");

    const bulk = [
      { title:"A", price:10, currency:"IDR", sellerName:"sa", marketplace:"m1", listingUrl:"https://a.b", imageUrls:[], observedAt:"2026-01-01T00:00:00Z", sourceType:"json_import", productId:"pb" },
      { title:"B", price:20, currency:"IDR", sellerName:"sb", marketplace:"m2", listingUrl:"https://b.c", imageUrls:[], observedAt:"2026-01-02T00:00:00Z", sourceType:"json_import", productId:"pb" },
    ];
    const bl = createListingsBulk(bulk);
    assert(bl.length === 2, "createListingsBulk: 2 listings");

    for (let i = 0; i < bl.length; i++) {
      const ev = getEvidence(bl[i].id);
      assert(ev.length > 0, "Bulk listing evidence exists");
      assert(ev.find(e=>e.fieldName==="title")?.extractedValue === bulk[i].title, "Bulk title match");
      for (const e of ev) assert(e.listingId === bl[i].id, "Bulk evidence links to listing");
    }

    assert(fs.existsSync(path.join(tmpDir, "evidence.json")), "evidence.json on disk");
    const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "evidence.json"), "utf-8"));
    assert(raw.length > 0, "evidence.json has records");
  } catch(e) {
    console.error("  ERROR: " + e.message + "\n" + e.stack);
    failed++;
  }
  console.log("\nResults: " + passed + " passed, " + failed + " failed");
  delete process.env.BRANDARMOR_DATA_DIR;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  process.exit(failed > 0 ? 1 : 0);
}
run();
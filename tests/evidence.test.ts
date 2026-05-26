import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  setDataDir,
  resetDataDir,
  createListing,
  createListingsBulk,
  getEvidence,
} from "../src/persistence/store";
import { insertEvidenceSchema, type InsertEvidence } from "../src/domain/schemas";

function tmpDataDir(): string {
  return path.join(os.tmpdir(), `ba-evidence-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

function cleanup(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
}

describe("evidence schema constraints", () => {
  it("requires listingId, evidenceType, fieldName, extractedValue", () => {
    const cases: Array<{ input: Partial<InsertEvidence>; shouldPass: boolean }> = [
      { input: { listingId: "l1", evidenceType: "text", fieldName: "title", extractedValue: "T" }, shouldPass: true },
      { input: { evidenceType: "text", fieldName: "title", extractedValue: "T" }, shouldPass: false },
      { input: { listingId: "l1", fieldName: "title", extractedValue: "T" }, shouldPass: false },
      { input: { listingId: "l1", evidenceType: "text", extractedValue: "T" }, shouldPass: false },
      { input: { listingId: "l1", evidenceType: "text", fieldName: "title" }, shouldPass: false },
    ];
    for (const c of cases) {
      const result = insertEvidenceSchema.safeParse(c.input);
      expect(result.success).toBe(c.shouldPass);
    }
  });

  it("allows null for rawValue, confidence, notes", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title",
      extractedValue: "v", rawValue: null, confidence: null, notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence below 0", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title",
      extractedValue: "v", confidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title",
      extractedValue: "v", confidence: 1.01,
    });
    expect(result.success).toBe(false);
  });

  it("accepts confidence at boundaries 0 and 1", () => {
    expect(insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title",
      extractedValue: "v", confidence: 0,
    }).success).toBe(true);
    expect(insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title",
      extractedValue: "v", confidence: 1,
    }).success).toBe(true);
  });

  it("accepts empty extractedValue", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "text", fieldName: "title", extractedValue: "",
    });
    expect(result.success).toBe(true);
  });

  it("preserves rawValue distinct from extractedValue", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1", evidenceType: "numeric", fieldName: "price",
      extractedValue: "150000", rawValue: "Rp 150.000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extractedValue).toBe("150000");
      expect(result.data.rawValue).toBe("Rp 150.000");
    }
  });

  it("evidenceType examples: text, numeric, url, images, enum, timestamp, flag", () => {
    const types = ["text", "numeric", "url", "images", "enum", "timestamp", "flag"];
    for (const t of types) {
      const result = insertEvidenceSchema.safeParse({
        listingId: "l1", evidenceType: t, fieldName: "f", extractedValue: "v",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("evidence persistence behavior", () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDataDir();
    setDataDir(dir);
  });

  afterEach(() => {
    resetDataDir();
    cleanup(dir);
  });

  it("createListing writes retrievable evidence records", () => {
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

    expect(listing.id).toBeTruthy();

    const evidenceRecords = getEvidence(listing.id);
    expect(evidenceRecords.length).toBeGreaterThan(0);

    // Verify representative fields
    const byField = new Map(evidenceRecords.map(e => [e.fieldName, e]));

    // title
    const titleEv = byField.get("title");
    expect(titleEv).toBeDefined();
    expect(titleEv!.extractedValue).toBe("Test Product KW Super Grade AAA");
    expect(titleEv!.evidenceType).toBe("text");

    // price
    const priceEv = byField.get("price");
    expect(priceEv).toBeDefined();
    expect(priceEv!.extractedValue).toBe("50000");
    expect(priceEv!.evidenceType).toBe("numeric");

    // seller
    const sellerEv = byField.get("seller");
    expect(sellerEv).toBeDefined();
    expect(sellerEv!.extractedValue).toBe("toko_murah_123");

    // marketplace
    const marketplaceEv = byField.get("marketplace");
    expect(marketplaceEv).toBeDefined();
    expect(marketplaceEv!.extractedValue).toBe("shopee");
    expect(marketplaceEv!.evidenceType).toBe("enum");

    // observedAt
    const observedEv = byField.get("observedAt");
    expect(observedEv).toBeDefined();
    expect(observedEv!.extractedValue).toBe("2026-05-07T08:00:00Z");
    expect(observedEv!.evidenceType).toBe("timestamp");

    // sourceType
    const sourceEv = byField.get("sourceType");
    expect(sourceEv).toBeDefined();
    expect(sourceEv!.extractedValue).toBe("manual");

    // imageUrls
    const imagesEv = byField.get("imageUrls");
    expect(imagesEv).toBeDefined();
    expect(imagesEv!.evidenceType).toBe("images");
    const parsedUrls = JSON.parse(imagesEv!.extractedValue);
    expect(parsedUrls).toEqual(["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"]);

    // All evidence records link back to the listing
    for (const ev of evidenceRecords) {
      expect(ev.listingId).toBe(listing.id);
    }
  });

  it("createListingsBulk writes retrievable evidence records per listing", () => {
    const rawListings = [
      {
        title: "Batik Nusantara Premium 50rb",
        price: 50000,
        currency: "IDR",
        sellerName: "toko_batik_a",
        marketplace: "shopee",
        listingUrl: "https://shopee.co.id/batik-a",
        imageUrls: ["https://img.example.com/ba1.jpg"],
        observedAt: "2026-05-07T09:00:00Z",
        sourceType: "json_import" as const,
        productId: "prod-test-2",
      },
      {
        title: "Batik Nusantara Style Replica",
        price: 85000,
        currency: "IDR",
        sellerName: "toko_batik_b",
        marketplace: "tokopedia",
        listingUrl: "https://tokopedia.com/batik-b",
        imageUrls: [],
        observedAt: "2026-05-07T09:05:00Z",
        sourceType: "json_import" as const,
        productId: "prod-test-2",
      },
      {
        title: "Batik Nusantara Original Diskon",
        price: 245000,
        currency: "IDR",
        sellerName: "Batik Nusantara Official",
        marketplace: "shopee",
        listingUrl: "https://shopee.co.id/batik-official",
        imageUrls: ["https://img.example.com/bo1.jpg"],
        observedAt: "2026-05-07T09:10:00Z",
        sourceType: "json_import" as const,
        productId: "prod-test-2",
      },
    ];

    const listings = createListingsBulk(rawListings);
    expect(listings).toHaveLength(3);

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const evidenceRecords = getEvidence(listing.id);
      expect(evidenceRecords.length).toBeGreaterThan(0);

      // Each listing's evidence should link back to it
      for (const ev of evidenceRecords) {
        expect(ev.listingId).toBe(listing.id);
      }

      // Verify title evidence matches
      const byField = new Map(evidenceRecords.map(e => [e.fieldName, e]));
      expect(byField.get("title")?.extractedValue).toBe(rawListings[i].title);

      // Verify price evidence matches
      expect(byField.get("price")?.extractedValue).toBe(String(rawListings[i].price));

      // Verify seller evidence matches
      expect(byField.get("seller")?.extractedValue).toBe(rawListings[i].sellerName);

      // Verify marketplace evidence matches
      expect(byField.get("marketplace")?.extractedValue).toBe(rawListings[i].marketplace);
    }

    // Evidence files should be isolated in the test dir, not in cwd
    const evidencePath = path.join(dir, "evidence.json");
    expect(fs.existsSync(evidencePath)).toBe(true);
  });

  it("evidence directory is isolated from default data dir", () => {
    const defaultDir = path.resolve(process.cwd(), ".brandarmor-data");
    const defaultExistsBefore = fs.existsSync(defaultDir);

    createListing({
      title: "Isolation Test",
      price: 5000,
      currency: "IDR",
      sellerName: "test_seller",
      marketplace: "tokopedia",
      imageUrls: [],
      observedAt: "2026-05-07T10:00:00Z",
      sourceType: "manual",
    });

    // After creation, evidence should be in temp dir, not default
    const testEvidencePath = path.join(dir, "evidence.json");
    expect(fs.existsSync(testEvidencePath)).toBe(true);

    // Default dir should not have been created by this test
    if (!defaultExistsBefore) {
      // If it didn't exist before, it shouldn't exist now
      expect(fs.existsSync(defaultDir)).toBe(false);
    }
  });
});

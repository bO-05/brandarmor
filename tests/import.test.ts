import { describe, it, expect } from "vitest";
import { parseJsonImport, getImportTemplate } from "../src/domain/import";

describe("parseJsonImport", () => {
  it("parses a single valid record", () => {
    const result = parseJsonImport(JSON.stringify({
      title: "Test Product",
      price: 100000,
      marketplace: "tokopedia",
    }));
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.listings[0].title).toBe("Test Product");
    expect(result.listings[0].sourceType).toBe("json_import");
    expect(result.listings[0].rawSource).toEqual({ title: "Test Product", price: 100000, marketplace: "tokopedia" });
  });

  it("parses an array of records", () => {
    const result = parseJsonImport(JSON.stringify([
      { title: "Product A", price: 50000, sellerName: "SellerA" },
      { title: "Product B", price: 75000, sellerName: "SellerB" },
    ]));
    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("reports errors for invalid records", () => {
    const result = parseJsonImport(JSON.stringify([
      { price: 50000 },
    ]));
    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe("general");
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseJsonImport("not valid json");
    expect(result.success).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].field).toBe("root");
  });

  it("parses price from string", () => {
    const result = parseJsonImport(JSON.stringify({
      title: "Test",
      price: "150000",
      sellerName: "Seller",
    }));
    expect(result.listings[0].price).toBe(150000);
  });

  it("validates URL format", () => {
    const result = parseJsonImport(JSON.stringify({
      title: "Test",
      listingUrl: "not-a-url",
      sellerName: "Seller",
    }));
    expect(result.failed).toBe(1);
    expect(result.errors[0].field).toBe("listingUrl");
  });

  it("saves raw source payload", () => {
    const input = { title: "Test", price: 100000, sellerName: "S", extraField: "bonus" };
    const result = parseJsonImport(JSON.stringify(input));
    expect(result.listings[0].rawSource).toEqual(input);
  });

  it("returns empty for non-object record", () => {
    const result = parseJsonImport(JSON.stringify(["just a string"]));
    expect(result.failed).toBe(1);
  });
});

describe("getImportTemplate", () => {
  it("returns a template array", () => {
    const template = getImportTemplate();
    expect(Array.isArray(template)).toBe(true);
    expect(template.length).toBeGreaterThan(0);
    expect(template[0]).toHaveProperty("title");
    expect(template[0]).toHaveProperty("price");
  });
});

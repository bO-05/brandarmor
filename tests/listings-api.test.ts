import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createBrand, createListing, createProduct, getListing, resetDataDir, setDataDir } from "../src/persistence/store";

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/listings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/listings", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-listings-api-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("links an existing listing to an existing product baseline", async () => {
    const route = await import("../src/app/api/listings/route");
    const patch = (route as { PATCH?: (request: Request) => Promise<Response> }).PATCH;
    expect(typeof patch).toBe("function");

    const brand = createBrand({ name: "Somethinc", description: null, websiteUrl: null, logoUrl: null });
    const product = createProduct({
      brandId: brand.id,
      name: "Somethinc Calm Down",
      sku: null,
      msrp: 129000,
      msrpCurrency: "IDR",
      msrpMin: null,
      msrpMax: null,
      description: null,
      officialUrls: [],
      officialImageUrls: [],
      requiredKeywords: [],
      suspiciousTerms: [],
      counterfeitTerms: [],
      authorizedSellers: [],
      packagingNotes: null,
      labelNotes: null,
      referenceImageNotes: null,
      category: "skincare_cosmetics",
      variant: null,
      sizeLabel: null,
      bpomNie: null,
      ingredientsHighlights: [],
      packagingClaims: [],
    });
    const listing = createListing({
      productId: null,
      title: "Marketplace candidate",
      observedAt: "2026-05-23T00:00:00.000Z",
      sourceType: "manual",
    });

    const response = await patch!(patchRequest({ id: listing.id, productId: product.id }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.productId).toBe(product.id);
    expect(getListing(listing.id)?.productId).toBe(product.id);
  });

  it("returns 400 for invalid payloads", async () => {
    const route = await import("../src/app/api/listings/route");
    const patch = (route as { PATCH?: (request: Request) => Promise<Response> }).PATCH;
    expect(typeof patch).toBe("function");

    const response = await patch!(patchRequest({ id: "", productId: "" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
  });

  it("returns 404 when the listing or product does not exist", async () => {
    const route = await import("../src/app/api/listings/route");
    const patch = (route as { PATCH?: (request: Request) => Promise<Response> }).PATCH;
    expect(typeof patch).toBe("function");

    const missingListing = await patch!(patchRequest({ id: "missing-listing", productId: "missing-product" }));
    expect(missingListing.status).toBe(404);

    const listing = createListing({
      productId: null,
      title: "Unlinked listing",
      observedAt: "2026-05-23T00:00:00.000Z",
      sourceType: "manual",
    });
    const missingProduct = await patch!(patchRequest({ id: listing.id, productId: "missing-product" }));
    expect(missingProduct.status).toBe(404);
  });
});

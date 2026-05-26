import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { getBrands, getListings, getProducts, resetDataDir, seedDemoData, setDataDir } from "../src/persistence/store";

const testDataDir = path.join(process.cwd(), ".brandarmor-test-data", "seed-demo");

describe("demo seed data", () => {
  afterEach(() => {
    resetDataDir();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  it("uses real Somethinc and Gloglowing BPOM baselines instead of fictional demo brands", () => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    setDataDir(testDataDir);

    seedDemoData();

    const brands = getBrands();
    const products = getProducts();
    const listings = getListings();

    expect(brands.map((brand) => brand.name)).toEqual(expect.arrayContaining(["Somethinc", "Gloglowing Skin Care"]));
    expect(products).toEqual(expect.arrayContaining([
      expect.objectContaining({
      name: "Calm Down PHA 3% Soothing Everyday Toner",
      bpomNie: "NA18261203080",
      sizeLabel: "100 mL",
    }),
      expect.objectContaining({
        name: "Baby Glow Lip Serum",
        bpomNie: "NA18251303192",
        sizeLabel: "4 mL",
      }),
    ]));
    expect(products.find((product) => product.name === "Calm Down PHA 3% Soothing Everyday Toner")?.packagingNotes ?? "").toContain("BPOM NA18261203080");
    expect(products.find((product) => product.name === "Baby Glow Lip Serum")?.packagingNotes ?? "").toContain("BPOM NA18251303192");
    expect(listings.some((listing) => /somethinc/i.test(listing.title ?? ""))).toBe(true);
    expect(listings.some((listing) => /gloglowing/i.test(listing.title ?? ""))).toBe(true);
    expect(listings.every((listing) => !/glownusa/i.test(`${listing.title} ${listing.description}`))).toBe(true);
  });
});

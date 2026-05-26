import { describe, expect, it } from "vitest";

import { GLOGLOWING_DISCOVERY_QUERY } from "../src/lib/discovery-defaults";

describe("discovery defaults", () => {
  it("starts with a Gloglowing marketplace watch query", () => {
    expect(GLOGLOWING_DISCOVERY_QUERY).toContain("Gloglowing");
    expect(GLOGLOWING_DISCOVERY_QUERY).toMatch(/Shopee|Tokopedia|Lazada/i);
    expect(GLOGLOWING_DISCOVERY_QUERY).toMatch(/counterfeit|KW|palsu|fraud/i);
  });
});

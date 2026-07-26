import { describe, expect, it } from "vitest";

import { GLOGLOWING_DISCOVERY_QUERY } from "../src/lib/discovery-defaults";

describe("discovery defaults", () => {
  it("starts empty so user intent is not pre-biased by a synthetic counterfeit query", () => {
    expect(GLOGLOWING_DISCOVERY_QUERY).toBe("");
  });
});

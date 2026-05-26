import { afterEach, describe, expect, it } from "vitest";

import { discoverCandidates } from "../src/lib/search-discovery";

const originalPerplexityKey = process.env.PERPLEXITY_API_KEY;

describe("candidate discovery fallback", () => {
  afterEach(() => {
    if (originalPerplexityKey === undefined) delete process.env.PERPLEXITY_API_KEY;
    else process.env.PERPLEXITY_API_KEY = originalPerplexityKey;
  });

  it("keeps mock candidates brand-generic for Gloglowing queries", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const candidates = await discoverCandidates("Gloglowing Baby Glow Lip Serum suspicious marketplace");

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].title).toContain("Gloglowing");
    expect(candidates.every((candidate) => !candidate.url.toLowerCase().includes("somethinc"))).toBe(true);
    expect(candidates.every((candidate) => candidate.source === "mock")).toBe(true);
  });
});

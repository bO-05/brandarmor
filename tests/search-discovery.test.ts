import { afterEach, describe, expect, it } from "vitest";

import { discoverCandidates } from "../src/lib/search-discovery";

const originalPerplexityKey = process.env.PERPLEXITY_API_KEY;

describe("candidate discovery fallback", () => {
  afterEach(() => {
    if (originalPerplexityKey === undefined) delete process.env.PERPLEXITY_API_KEY;
    else process.env.PERPLEXITY_API_KEY = originalPerplexityKey;
  });

  it("does not fabricate candidates when verified marketplace discovery is unavailable", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const candidates = await discoverCandidates("Gloglowing Baby Glow Lip Serum suspicious marketplace");

    expect(candidates).toEqual([]);
  });
});

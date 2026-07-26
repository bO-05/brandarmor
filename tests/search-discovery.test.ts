import { afterEach, describe, expect, it } from "vitest";

import { discoverCandidates, verifiedMarketplaceForUrl } from "../src/lib/search-discovery";

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

  it("rejects marketplace search and category pages as listing candidates", () => {
    expect(verifiedMarketplaceForUrl("https://www.tokopedia.com/find/ms-glow-serum")).toBeNull();
    expect(verifiedMarketplaceForUrl("https://www.tokopedia.com/category/beauty")).toBeNull();
    expect(verifiedMarketplaceForUrl("https://www.tokopedia.com/ms-glow-official/serum-niacinamide")).toBe("tokopedia");
  });
});

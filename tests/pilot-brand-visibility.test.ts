import { afterEach, describe, expect, it, vi } from "vitest";

import type { Brand } from "../src/domain/types";

const brand: Brand = {
  id: "brand-neon-1",
  name: "MS Glow",
  description: null,
  websiteUrl: "https://msglowid.com/",
  logoUrl: null,
  createdAt: "2026-07-25T00:00:00.000Z",
  updatedAt: "2026-07-25T00:00:00.000Z",
};

describe("pilot brand visibility seam", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("loads the signed-in workspace brand list from the authenticated API after a brand is created", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([brand]), { status: 200 }));
    global.fetch = fetchMock;

    const { fetchWorkspaceBrands } = await import("../src/lib/pilot-api");

    await expect(fetchWorkspaceBrands()).resolves.toEqual([brand]);
    expect(fetchMock).toHaveBeenCalledWith("/api/brands", { cache: "no-store" });
  });
});

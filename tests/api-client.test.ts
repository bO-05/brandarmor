import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchJsonArray, fetchJsonObject } from "../src/lib/api-client";

describe("client API helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns array payloads from successful responses", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: "brand-1" }]), { status: 200 }));

    const result = await fetchJsonArray<{ id: string }>("/api/brands");

    expect(result.data).toEqual([{ id: "brand-1" }]);
    expect(result.error).toBeNull();
    expect(result.status).toBe(200);
  });

  it("returns an empty array and API error when an array endpoint fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "backend unavailable" }), { status: 500 }));

    const result = await fetchJsonArray<{ id: string }>("/api/brands");

    expect(result.data).toEqual([]);
    expect(result.error).toBe("backend unavailable");
    expect(result.status).toBe(500);
  });

  it("returns an empty array when an array endpoint returns the wrong shape", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "not an array" }), { status: 200 }));

    const result = await fetchJsonArray<{ id: string }>("/api/brands");

    expect(result.data).toEqual([]);
    expect(result.error).toBe("Unexpected API response");
    expect(result.status).toBe(200);
  });

  it("returns fallback object and API error when an object endpoint fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "metrics unavailable" }), { status: 500 }));

    const result = await fetchJsonObject("/api/evaluation", { cases: 0, metrics: [] });

    expect(result.data).toEqual({ cases: 0, metrics: [] });
    expect(result.error).toBe("metrics unavailable");
    expect(result.status).toBe(500);
  });
});

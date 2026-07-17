import { afterEach, describe, expect, it } from "vitest";

import { POST } from "../src/app/api/discovery/route";

const originalEnv = { ...process.env };

describe("POST /api/discovery", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 400 for malformed, null, or unusable query payloads", async () => {
    const malformed = await POST(new Request("http://localhost/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }));
    const nullBody = await POST(new Request("http://localhost/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    }));
    const blank = await POST(new Request("http://localhost/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "   " }),
    }));

    for (const response of [malformed, nullBody, blank]) {
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("query is required");
    }
  });

  it("keeps successful fallback discovery behavior unchanged", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const response = await POST(new Request("http://localhost/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Gloglowing suspicious listing" }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.candidates.length).toBeGreaterThan(0);
    expect(json.candidates.every((candidate: { source: string }) => candidate.source === "mock")).toBe(true);
  });
});

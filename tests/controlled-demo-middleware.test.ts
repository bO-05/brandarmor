import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../middleware";

/**
 * Public HTTP boundary: Next middleware for /api/*.
 * Controlled mode must cover every mutation entry point, not just the three
 * handlers exercised by the focused route test.
 */
describe("controlled demo middleware", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BRANDARMOR_RUNTIME_MODE = "controlled_demo";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("blocks every API mutation while leaving API reads available", async () => {
    for (const pathname of [
      "/api/review",
      "/api/discovery",
      "/api/ocr",
      "/api/regulatory/check",
      "/api/visual/compare",
      "/api/assessments/run",
      "/api/evaluation",
      "/api/seed",
    ]) {
      const response = middleware(new NextRequest(`http://localhost${pathname}`, { method: "POST" }));
      expect(response.status).toBe(423);
      await expect(response.json()).resolves.toMatchObject({ code: "controlled_demo_read_only" });
    }

    const readResponse = middleware(new NextRequest("http://localhost/api/listings", { method: "GET" }));
    expect(readResponse.headers.get("x-middleware-next")).toBe("1");
  });
});

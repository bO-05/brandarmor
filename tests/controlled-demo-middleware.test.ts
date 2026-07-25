import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "../src/proxy";

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
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await proxy(new NextRequest(`http://localhost${pathname}`, { method }), {} as any);
        expect(response.status).toBe(423);
        await expect(response.json()).resolves.toMatchObject({ code: "controlled_demo_read_only" });
      }
    }

    const readResponse = await proxy(new NextRequest("http://localhost/api/listings", { method: "GET" }), {} as any);
    expect(readResponse.headers.get("x-middleware-next")).toBe("1");
  });

  it("blocks unconverted pilot mutations before they can reach JSON routes", async () => {
    process.env.BRANDARMOR_RUNTIME_MODE = "pilot";
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const response = await proxy(new NextRequest("http://localhost/api/demo/run", { method: "POST" }), {} as any);

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({ code: "pilot_route_not_implemented" });
  });
});

import { afterEach, describe, expect, it } from "vitest";

const originalEnv = { ...process.env };

describe("GET /api/health/auth", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("keeps detailed credential configuration private outside an authenticated pilot request", async () => {
    process.env.BRANDARMOR_RUNTIME_MODE = "controlled_demo";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_health_probe";
    process.env.CLERK_SECRET_KEY = "sk_test_health_probe";
    process.env.BLOB_STORE_ID = "store_health_probe";
    process.env.INNGEST_EVENT_KEY = "event_health_probe";
    process.env.INNGEST_SIGNING_KEY = "signing_health_probe";

    const { NextRequest } = await import("next/server");
    const route = await import("../src/app/api/health/auth/route");
    const response = await route.GET(new NextRequest("http://localhost/api/health/auth"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", runtimeMode: "controlled_demo" });
    expect(JSON.stringify(body)).not.toContain("pk_test_health_probe");
    expect(JSON.stringify(body)).not.toContain("sk_test_health_probe");
  });
});

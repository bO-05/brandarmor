import { afterEach, describe, expect, it } from "vitest";

const originalEnv = { ...process.env };

describe("GET /api/health/auth", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports pilot configuration presence without exposing Clerk key values", async () => {
    process.env.BRANDARMOR_RUNTIME_MODE = "pilot";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_health_probe";
    process.env.CLERK_SECRET_KEY = "sk_test_health_probe";

    const route = await import("../src/app/api/health/auth/route");
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      runtimeMode: "pilot",
      clerkPublishableKeyConfigured: true,
      clerkSecretKeyConfigured: true,
      clerkServerConfigured: true,
      privateBlobConfigured: false,
      inngestConfigured: false,
    });
    expect(JSON.stringify(body)).not.toContain("pk_test_health_probe");
    expect(JSON.stringify(body)).not.toContain("sk_test_health_probe");
  });
});

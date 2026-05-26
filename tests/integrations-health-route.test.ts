import { afterEach, describe, expect, it } from "vitest";

import { GET } from "../src/app/api/health/integrations/route";

const originalEnv = { ...process.env };

describe("GET /api/health/integrations", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports configured envs separately from implemented app paths", async () => {
    process.env.MISTRAL_API_KEY = "set";
    process.env.ANTHROPIC_API_KEY = "set";
    process.env.PERPLEXITY_API_KEY = "set";
    process.env.BROWSER_USE_ENDPOINT = "http://localhost:8000";
    delete process.env.HF_API_TOKEN;

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.integrations.mistralOcr).toMatchObject({ configured: true, implemented: true });
    expect(json.integrations.anthropicJudge).toMatchObject({ configured: true, implemented: true });
    expect(json.integrations.perplexityDiscovery).toMatchObject({ configured: true, implemented: true });
    expect(json.integrations.browserUseCapture).toMatchObject({ configured: true, implemented: false });
    expect(json.integrations.huggingFaceVision).toMatchObject({ configured: false, implemented: false });
  });
});

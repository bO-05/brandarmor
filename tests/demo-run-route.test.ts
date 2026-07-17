import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEvidence, resetDataDir, setDataDir } from "../src/persistence/store";

const originalEnv = { ...process.env };

describe("POST /api/demo/run", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-demo-route-"));
    setDataDir(tmpDir);
    process.env.BPOM_DISABLE_API = "1";
    delete process.env.MISTRAL_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("persists a bounded core stage before the separate judge stage and avoids generated evidence duplication", async () => {
    const route = await import("../src/app/api/demo/run/route");

    const firstResponse = await route.POST();
    const first = await firstResponse.json();
    const firstGeneratedFields = getEvidence(first.listingId)
      .filter((entry) => ["ocr_markdown", "ocr_bpom_nie", "ocr_volume_or_size", "ocr_claims", "regulatory_status", "visual_similarity"].includes(entry.fieldName))
      .map((entry) => entry.fieldName)
      .sort();

    const secondResponse = await route.POST();
    const second = await secondResponse.json();
    const secondGeneratedFields = getEvidence(second.listingId)
      .filter((entry) => ["ocr_markdown", "ocr_bpom_nie", "ocr_volume_or_size", "ocr_claims", "regulatory_status", "visual_similarity"].includes(entry.fieldName))
      .map((entry) => entry.fieldName)
      .sort();

    expect(firstResponse.status).toBe(201);
    expect(first.nextStep).toMatchObject({ id: "judge", endpoint: "/api/judge" });
    expect(first.timings.core).toBeTypeOf("number");
    expect(first.status.usedMockOcr).toBe(true);
    expect(first.judge).toBeUndefined();
    expect(secondResponse.status).toBe(201);
    expect(second.listingId).toBe(first.listingId);
    expect(secondGeneratedFields).toEqual(firstGeneratedFields);
    expect(route.maxDuration).toBe(60);
  });
});

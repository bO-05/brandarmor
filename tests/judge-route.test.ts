import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

const originalEnv = { ...process.env };

describe("POST /api/judge", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-judge-route-"));
    setDataDir(tmpDir);
    process.env.BRANDARMOR_AUTO_SEED = "1";
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MISTRAL_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("seeds a cold store before judging a deterministic demo listing", async () => {
    const route = await import("../src/app/api/judge/route");
    const request = new Request("http://localhost/api/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "seed0000000060", forceMock: true }),
    });

    const response = await route.POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.listingId).toBe("seed0000000060");
    expect(json.provider).toBe("mock");
  });
});

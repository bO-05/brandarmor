import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDataDir, setDataDir } from "../src/persistence/store";

/**
 * Public seam: GET /api/evaluation?compute=true.
 * Independent policy: authored fixture diagnostics may support regression tests,
 * but they must not expose labels or claim operational accuracy.
 */
describe("GET /api/evaluation diagnostic boundary", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brandarmor-evaluation-boundary-"));
    setDataDir(tmpDir);
  });

  afterEach(() => {
    resetDataDir();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns non-claim diagnostic metadata without exposing evaluation labels", async () => {
    const route = await import("../src/app/api/evaluation/route");
    const response = await route.GET(new Request("http://localhost/api/evaluation?compute=true"));
    const body = await response.text();
    const payload = JSON.parse(body);

    expect(response.status).toBe(200);
    expect(payload.evaluationMode).toBe("synthetic_regression_diagnostics");
    expect(payload.accuracyClaimsSupported).toBe(false);
    expect(payload.datasetLabel).toContain("authored fixtures");
    expect(body).not.toContain("groundTruth");
  });
});

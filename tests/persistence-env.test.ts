import { afterEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";

import { getDataDir, resetDataDir, setDataDir } from "../src/persistence/store";

const ORIGINAL_BRANDARMOR_DATA_DIR = process.env.BRANDARMOR_DATA_DIR;
const ORIGINAL_VERCEL = process.env.VERCEL;
const ORIGINAL_AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME;
const SERVERLESS_DEFAULT_DATA_DIR = path.join(os.tmpdir(), ".brandarmor-data");

function restoreEnv(): void {
  if (ORIGINAL_BRANDARMOR_DATA_DIR === undefined) delete process.env.BRANDARMOR_DATA_DIR;
  else process.env.BRANDARMOR_DATA_DIR = ORIGINAL_BRANDARMOR_DATA_DIR;

  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;

  if (ORIGINAL_AWS_LAMBDA_FUNCTION_NAME === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  else process.env.AWS_LAMBDA_FUNCTION_NAME = ORIGINAL_AWS_LAMBDA_FUNCTION_NAME;
}

describe("persistence data directory resolution", () => {
  afterEach(() => {
    resetDataDir();
    restoreEnv();
  });

  it("uses the platform temp directory in Vercel serverless environments when no override is set", () => {
    delete process.env.BRANDARMOR_DATA_DIR;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.VERCEL = "1";
    resetDataDir();

    expect(getDataDir()).toBe(SERVERLESS_DEFAULT_DATA_DIR);
  });

  it("uses environment overrides outside serverless environments", () => {
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.BRANDARMOR_DATA_DIR = "env-data";
    resetDataDir();

    expect(getDataDir()).toBe("env-data");
  });

  it("ignores relative BRANDARMOR_DATA_DIR in Vercel serverless environments", () => {
    process.env.VERCEL = "1";
    process.env.BRANDARMOR_DATA_DIR = "env-data";
    resetDataDir();

    expect(getDataDir()).toBe(SERVERLESS_DEFAULT_DATA_DIR);
  });

  it("allows /tmp BRANDARMOR_DATA_DIR overrides in serverless environments", () => {
    process.env.VERCEL = "1";
    process.env.BRANDARMOR_DATA_DIR = "/tmp/brandarmor-custom";
    resetDataDir();

    expect(getDataDir()).toBe("/tmp/brandarmor-custom");
  });

  it("keeps explicit test overrides ahead of Vercel defaults", () => {
    process.env.VERCEL = "1";
    process.env.BRANDARMOR_DATA_DIR = "env-data";
    resetDataDir();

    setDataDir("explicit-data");
    expect(getDataDir()).toBe("explicit-data");
  });
});

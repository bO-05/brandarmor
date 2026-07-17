import { describe, expect, it } from "vitest";
import { ProviderRequestError, ProviderTimeoutError, providerFailure } from "../src/lib/provider-safety";

describe("provider safety helpers", () => {
  it("converts timeouts into a short safe provider message", () => {
    const failure = providerFailure(new ProviderTimeoutError("Evidence judge", 12_000), "Evidence judge");
    expect(failure).toMatchObject({ code: "provider_timeout", provider: "Evidence judge" });
    expect(failure.safeMessage).toContain("12 seconds");
  });

  it("does not expose arbitrary request error details", () => {
    const failure = providerFailure(new ProviderRequestError("Mistral OCR"), "Mistral OCR");
    expect(failure.safeMessage).toBe("Mistral OCR could not complete the request.");

    const unknown = providerFailure(new Error("token=secret"), "Mistral OCR");
    expect(unknown.safeMessage).toBe("Mistral OCR could not complete the request.");
    expect(unknown.safeMessage).not.toContain("secret");
  });
});

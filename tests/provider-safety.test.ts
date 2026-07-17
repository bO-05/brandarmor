import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithProviderTimeout, ProviderRequestError, ProviderTimeoutError, providerFailure } from "../src/lib/provider-safety";

const realFetch = globalThis.fetch;

describe("provider safety helpers", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

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

  it("keeps the timeout active while a provider response body is still parsing", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      return {
        ok: true,
        status: 200,
        json: () => new Promise((_, reject) => {
          signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
      } as Response;
    }) as typeof fetch;

    await expect(fetchJsonWithProviderTimeout("Perplexity discovery", "https://example.test", {}, 10))
      .rejects.toMatchObject({ name: "ProviderTimeoutError", code: "provider_timeout" });
  });
});

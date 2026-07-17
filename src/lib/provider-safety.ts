export class ProviderTimeoutError extends Error {
  readonly code = "provider_timeout";

  constructor(
    readonly provider: string,
    readonly timeoutMs: number,
    message = `${provider} did not respond within ${Math.ceil(timeoutMs / 1000)} seconds.`
  ) {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderRequestError extends Error {
  readonly code = "provider_request_failed";

  constructor(readonly provider: string) {
    super(`${provider} could not complete the request.`);
    this.name = "ProviderRequestError";
  }
}

export type ProviderFailure = {
  code: "provider_timeout" | "provider_request_failed";
  provider: string;
  safeMessage: string;
};

export async function fetchJsonWithProviderTimeout<T = unknown>(
  provider: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12_000
): Promise<{ response: Response; json: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    try {
      const json = await response.json() as T;
      return { response, json };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ProviderTimeoutError(provider, timeoutMs);
      }
      return { response, json: null };
    }
  } catch (error) {
    if (error instanceof ProviderTimeoutError || error instanceof ProviderRequestError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new ProviderTimeoutError(provider, timeoutMs);
    }
    throw new ProviderRequestError(provider);
  } finally {
    clearTimeout(timer);
  }
}

export function providerFailure(error: unknown, provider: string): ProviderFailure {
  if (error instanceof ProviderTimeoutError) {
    return {
      code: "provider_timeout",
      provider: error.provider,
      safeMessage: error.message,
    };
  }

  if (error instanceof ProviderRequestError) {
    return {
      code: "provider_request_failed",
      provider: error.provider,
      safeMessage: error.message,
    };
  }

  return {
    code: "provider_request_failed",
    provider,
    safeMessage: `${provider} could not complete the request.`,
  };
}

export function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

export interface ApiReadResult<T> {
  data: T;
  error: string | null;
  status: number | null;
}

interface FetchJsonOptions<T> {
  init?: RequestInit;
  validate?: (value: unknown) => value is T;
}

function apiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.length > 0) return error;
  }
  return fallback;
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchJsonArray<T>(
  input: RequestInfo | URL,
  options: FetchJsonOptions<T[]> = {}
): Promise<ApiReadResult<T[]>> {
  try {
    const response = await fetch(input, options.init);
    const payload = await readPayload(response);
    if (!response.ok) {
      return {
        data: [],
        error: apiError(payload, `Request failed (${response.status})`),
        status: response.status,
      };
    }
    if (!Array.isArray(payload)) {
      return { data: [], error: "Unexpected API response", status: response.status };
    }
    return { data: payload as T[], error: null, status: response.status };
  } catch (error) {
    return { data: [], error: (error as Error).message, status: null };
  }
}

export async function fetchJsonObject<T>(
  input: RequestInfo | URL,
  fallback: T,
  options: FetchJsonOptions<T> = {}
): Promise<ApiReadResult<T>> {
  try {
    const response = await fetch(input, options.init);
    const payload = await readPayload(response);
    if (!response.ok) {
      return {
        data: fallback,
        error: apiError(payload, `Request failed (${response.status})`),
        status: response.status,
      };
    }
    const valid = options.validate
      ? options.validate(payload)
      : Boolean(payload && typeof payload === "object" && !Array.isArray(payload));
    if (!valid) {
      return { data: fallback, error: "Unexpected API response", status: response.status };
    }
    return { data: payload as T, error: null, status: response.status };
  } catch (error) {
    return { data: fallback, error: (error as Error).message, status: null };
  }
}

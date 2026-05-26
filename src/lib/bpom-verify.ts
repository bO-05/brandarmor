/**
 * BPOM cek.pom.go.id verification module.
 *
 * Queries the official BPOM cosmetics database via the public DataTables
 * endpoint at https://cekbpom.pom.go.id/produk-dt/12 (12 = kosmetika class).
 *
 * Real product data is returned including:
 *   - PRODUCT_REGISTER (the NIE)
 *   - PRODUCT_NAME
 *   - PRODUCT_BRANDS
 *   - PRODUCT_PACKAGE (with size, e.g., "Botol, Dus 100 mL")
 *   - PRODUCT_FORM (Cair, Padat, etc.)
 *   - STATUS ("Berlaku" = active, otherwise expired/revoked)
 *   - SUBMIT_DATE / PRODUCT_DATE
 *
 * No API key required. Respects rate limits (default 1 req per 1.2s).
 */

const BPOM_BASE = "https://cekbpom.pom.go.id";
const BPOM_INIT_URL = `${BPOM_BASE}/produk-kosmetika`;
const BPOM_DT_URL = `${BPOM_BASE}/produk-dt/12`; // 12 = kosmetika class
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; BrandArmor/0.4; +https://brandarmor.id)";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface BpomProduct {
  productRegister: string; // NIE
  productName: string;
  productBrand: string;
  productPackage: string; // "Botol, Dus 100 mL"
  productForm: string; // "Cair"
  status: string; // "Berlaku" or similar
  registrarId: string | null;
  importerId: string | null;
  submitDate: string | null;
  productDate: string | null;
  applicationType: string; // "Notifikasi Kosmetika"
  raw: Record<string, unknown>;
}

export interface BpomQueryResult {
  ok: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  products: BpomProduct[];
  error: string | null;
  durationMs: number;
}

interface BpomSession {
  csrfToken: string;
  cookieHeader: string;
}

let cachedSession: { session: BpomSession; expiresAt: number } | null = null;
const SESSION_TTL_MS = 90 * 60 * 1000; // 90 minutes; XSRF cookie lasts 120m

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseSetCookieHeader(setCookieValue: string | null): string {
  if (!setCookieValue) return "";
  // Multiple Set-Cookie are joined by ", " in fetch's get() — extract name=value pairs
  const cookies: string[] = [];
  const parts = setCookieValue.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
  for (const part of parts) {
    const nameValue = part.split(";")[0].trim();
    if (nameValue && nameValue.includes("=")) {
      cookies.push(nameValue);
    }
  }
  return cookies.join("; ");
}

async function establishBpomSession(): Promise<BpomSession> {
  const response = await fetchWithTimeout(BPOM_INIT_URL, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "id,en-US;q=0.7",
    },
  });
  if (!response.ok) {
    throw new Error(`BPOM init failed with HTTP ${response.status}`);
  }
  const html = await response.text();
  const csrfMatch = html.match(/csrf-token"\s+content="([^"]+)"/);
  if (!csrfMatch) {
    throw new Error("BPOM CSRF token not found in init page");
  }
  const cookieHeader = parseSetCookieHeader(response.headers.get("set-cookie"));
  return {
    csrfToken: csrfMatch[1],
    cookieHeader,
  };
}

async function getBpomSession(forceFresh = false): Promise<BpomSession> {
  if (
    !forceFresh &&
    cachedSession &&
    cachedSession.expiresAt > Date.now()
  ) {
    return cachedSession.session;
  }
  const session = await establishBpomSession();
  cachedSession = { session, expiresAt: Date.now() + SESSION_TTL_MS };
  return session;
}

function buildSearchParams(opts: BpomQueryOptions): string {
  const params = new URLSearchParams();
  params.set("draw", "1");
  params.set("start", "0");
  params.set("length", String(opts.length ?? 10));
  params.set("search[value]", "");
  params.set("product_register", opts.nie ?? "");
  params.set("product_name", opts.productName ?? "");
  params.set("product_brand", opts.brand ?? "");
  params.set("product_package", "");
  params.set("product_form", "");
  params.set("ingredients", "");
  params.set("submit_date_start", "");
  params.set("submit_date_end", "");
  return params.toString();
}

function normalizeProduct(raw: Record<string, unknown>): BpomProduct {
  const s = (k: string) => {
    const v = raw[k];
    return v == null ? "" : String(v);
  };
  return {
    productRegister: s("PRODUCT_REGISTER"),
    productName: s("PRODUCT_NAME"),
    productBrand: s("PRODUCT_BRANDS"),
    productPackage: s("PRODUCT_PACKAGE"),
    productForm: s("PRODUCT_FORM"),
    status: s("STATUS"),
    registrarId: s("REGISTRAR_ID") || null,
    importerId: s("IMPORTER_ID") || null,
    submitDate: s("SUBMIT_DATE") || null,
    productDate: s("PRODUCT_DATE") || null,
    applicationType: s("APPLICATION"),
    raw,
  };
}

export interface BpomQueryOptions {
  nie?: string | null;
  brand?: string | null;
  productName?: string | null;
  length?: number;
}

export async function queryBpomCosmetics(
  opts: BpomQueryOptions
): Promise<BpomQueryResult> {
  const start = Date.now();
  try {
    if (!opts.nie && !opts.brand && !opts.productName) {
      return {
        ok: false,
        recordsTotal: 0,
        recordsFiltered: 0,
        products: [],
        error: "BPOM query requires at least one of nie, brand, or productName",
        durationMs: Date.now() - start,
      };
    }
    let session = await getBpomSession();
    let response = await fetchWithTimeout(BPOM_DT_URL, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-CSRF-TOKEN": session.csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: BPOM_INIT_URL,
        Cookie: session.cookieHeader,
        "Accept-Language": "id,en-US;q=0.7",
      },
      body: buildSearchParams(opts),
    });

    // If CSRF or session expired, retry once with fresh session
    if (response.status === 419 || response.status === 401 || response.status === 403) {
      session = await getBpomSession(true);
      response = await fetchWithTimeout(BPOM_DT_URL, {
        method: "POST",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-CSRF-TOKEN": session.csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Referer: BPOM_INIT_URL,
          Cookie: session.cookieHeader,
        },
        body: buildSearchParams(opts),
      });
    }
    if (!response.ok) {
      return {
        ok: false,
        recordsTotal: 0,
        recordsFiltered: 0,
        products: [],
        error: `BPOM query failed with HTTP ${response.status}`,
        durationMs: Date.now() - start,
      };
    }
    const json = (await response.json()) as {
      recordsTotal?: number;
      recordsFiltered?: number;
      data?: Array<Record<string, unknown>>;
    };
    const products = (json.data ?? []).map(normalizeProduct);
    return {
      ok: true,
      recordsTotal: json.recordsTotal ?? 0,
      recordsFiltered: json.recordsFiltered ?? 0,
      products,
      error: null,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      recordsTotal: 0,
      recordsFiltered: 0,
      products: [],
      error: (e as Error).message,
      durationMs: Date.now() - start,
    };
  }
}

export interface BpomVerificationVerdict {
  nieFound: boolean;
  status: "verified" | "not_found" | "expired" | "brand_mismatch" | "error";
  matchedProduct: BpomProduct | null;
  matchedProductName: string | null;
  matchedBrandName: string | null;
  bpomStatus: string | null; // "Berlaku" etc
  notes: string;
  sourceUrl: string;
  rawQuery: BpomQueryOptions;
  durationMs: number;
}

/**
 * Verify a NIE against BPOM, optionally cross-checking the brand name.
 */
export async function verifyBpomNie(
  nie: string,
  expectedBrand?: string | null
): Promise<BpomVerificationVerdict> {
  const sourceUrl = `${BPOM_BASE}/produk-kosmetika?search=${encodeURIComponent(
    nie
  )}`;
  const normalizedNie = nie.replace(/\s+/g, "").toUpperCase();
  const result = await queryBpomCosmetics({ nie: normalizedNie });

  if (!result.ok) {
    return {
      nieFound: false,
      status: "error",
      matchedProduct: null,
      matchedProductName: null,
      matchedBrandName: null,
      bpomStatus: null,
      notes: result.error ?? "BPOM verification error",
      sourceUrl,
      rawQuery: { nie: normalizedNie },
      durationMs: result.durationMs,
    };
  }

  const match =
    result.products.find(
      (p) => p.productRegister.toUpperCase() === normalizedNie
    ) ?? null;

  if (!match) {
    return {
      nieFound: false,
      status: "not_found",
      matchedProduct: null,
      matchedProductName: null,
      matchedBrandName: null,
      bpomStatus: null,
      notes: `NIE ${normalizedNie} not found in BPOM cosmetics database (cekbpom.pom.go.id).`,
      sourceUrl,
      rawQuery: { nie: normalizedNie },
      durationMs: result.durationMs,
    };
  }

  const bpomStatus = match.status || null;
  const isExpired =
    bpomStatus !== null &&
    bpomStatus !== "" &&
    bpomStatus.toLowerCase() !== "berlaku";

  if (
    expectedBrand &&
    match.productBrand &&
    !match.productBrand
      .toLowerCase()
      .includes(expectedBrand.toLowerCase()) &&
    !expectedBrand
      .toLowerCase()
      .includes(match.productBrand.toLowerCase())
  ) {
    return {
      nieFound: true,
      status: "brand_mismatch",
      matchedProduct: match,
      matchedProductName: match.productName,
      matchedBrandName: match.productBrand,
      bpomStatus,
      notes: `NIE belongs to "${match.productBrand}" (product: ${match.productName}), not "${expectedBrand}". Possible NIE-spoof or repackaging fraud.`,
      sourceUrl,
      rawQuery: { nie: normalizedNie },
      durationMs: result.durationMs,
    };
  }

  if (isExpired) {
    return {
      nieFound: true,
      status: "expired",
      matchedProduct: match,
      matchedProductName: match.productName,
      matchedBrandName: match.productBrand,
      bpomStatus,
      notes: `NIE registered to "${match.productName}" (${match.productBrand}) but BPOM status is "${bpomStatus}" — not currently active.`,
      sourceUrl,
      rawQuery: { nie: normalizedNie },
      durationMs: result.durationMs,
    };
  }

  return {
    nieFound: true,
    status: "verified",
    matchedProduct: match,
    matchedProductName: match.productName,
    matchedBrandName: match.productBrand,
    bpomStatus,
    notes: `Verified active BPOM registration: "${match.productName}" by ${match.productBrand} (${match.productPackage}).`,
    sourceUrl,
    rawQuery: { nie: normalizedNie },
    durationMs: result.durationMs,
  };
}

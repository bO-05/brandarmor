import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../src/app/api/regulatory/search/route";

const realFetch = globalThis.fetch;

function mockBpomBrandFetch() {
  return vi.fn(async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? "";
    if (url.includes("/produk-kosmetika") && (init?.method ?? "GET") === "GET") {
      return new Response(`<meta name="csrf-token" content="route-test-csrf">`, {
        status: 200,
        headers: {
          "set-cookie": "XSRF-TOKEN=xsrf-test; webreg_session=session-test; Path=/",
          "content-type": "text/html",
        },
      });
    }
    if (url.includes("/produk-dt/12")) {
      const params = new URLSearchParams(typeof init?.body === "string" ? init.body : "");
      return new Response(JSON.stringify({
        recordsTotal: 348982,
        recordsFiltered: params.get("product_brand") === "Somethinc" ? 676 : 0,
        data: [{
          PRODUCT_REGISTER: "NA18261203080",
          PRODUCT_NAME: "Calm Down PHA 3% Soothing Everyday Toner",
          PRODUCT_BRANDS: "SOMETHINC",
          PRODUCT_PACKAGE: "Botol, Dus 100 mL",
          PRODUCT_FORM: "Cair",
          STATUS: "Berlaku",
          APPLICATION: "Notifikasi Kosmetika",
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("not handled", { status: 500 });
  });
}

describe("GET /api/regulatory/search", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("queries live BPOM cosmetics data by brand through the adapter", async () => {
    globalThis.fetch = mockBpomBrandFetch() as any;

    const response = await GET(new Request("http://localhost/api/regulatory/search?brand=Somethinc&length=5"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.source).toBe("bpom_api");
    expect(json.query.brand).toBe("Somethinc");
    expect(json.recordsTotal).toBe(348982);
    expect(json.recordsFiltered).toBe(676);
    expect(json.products[0]).toMatchObject({
      productRegister: "NA18261203080",
      productBrand: "SOMETHINC",
      status: "Berlaku",
    });
  });

  it("rejects empty searches instead of scraping the full BPOM database", async () => {
    const response = await GET(new Request("http://localhost/api/regulatory/search"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/requires/i);
  });
});

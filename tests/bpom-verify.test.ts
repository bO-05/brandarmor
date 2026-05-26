import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { verifyBpomNie } from "@/lib/bpom-verify";

const realFetch = globalThis.fetch;

interface MockBpomRow {
  PRODUCT_REGISTER: string;
  PRODUCT_NAME: string;
  PRODUCT_BRANDS: string;
  PRODUCT_PACKAGE: string;
  PRODUCT_FORM: string;
  STATUS: string;
  REGISTRAR_ID?: string;
  IMPORTER_ID?: string | null;
  SUBMIT_DATE?: string;
  PRODUCT_DATE?: string;
  APPLICATION?: string;
}

function mockBpomFetch(rows: MockBpomRow[]) {
  return vi.fn(async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? "";
    if (url.includes("/produk-kosmetika") && (init?.method ?? "GET") === "GET") {
      // CSRF init page
      const html = `<html><head><meta name="csrf-token" content="test-csrf-token-abc"></head><body></body></html>`;
      return new Response(html, {
        status: 200,
        headers: {
          "set-cookie":
            "XSRF-TOKEN=xsrf-test; webreg_session=session-test; Path=/",
          "content-type": "text/html",
        },
      });
    }
    if (url.includes("/produk-dt/12")) {
      // The query body
      const body =
        typeof init?.body === "string" ? init.body : "";
      const params = new URLSearchParams(body);
      const wantedNie = (params.get("product_register") ?? "").toUpperCase();
      const filtered = rows.filter(
        (r) => r.PRODUCT_REGISTER.toUpperCase() === wantedNie
      );
      return new Response(
        JSON.stringify({
          draw: 1,
          recordsTotal: 1000,
          recordsFiltered: filtered.length,
          data: filtered,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }
    return new Response("not handled", { status: 500 });
  });
}

describe("verifyBpomNie", () => {
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it("returns verified_active for an exact NIE match with active status", async () => {
    globalThis.fetch = mockBpomFetch([
      {
        PRODUCT_REGISTER: "NA18261203080",
        PRODUCT_NAME: "Calm Down PHA 3% Soothing Everyday Toner",
        PRODUCT_BRANDS: "SOMETHINC",
        PRODUCT_PACKAGE: "Botol, Dus 100 mL",
        PRODUCT_FORM: "Cair",
        STATUS: "Berlaku",
      },
    ]) as any;
    const result = await verifyBpomNie("NA18261203080", "Somethinc");
    expect(result.nieFound).toBe(true);
    expect(result.status).toBe("verified");
    expect(result.matchedBrandName).toBe("SOMETHINC");
    expect(result.matchedProductName).toContain("Calm Down");
    expect(result.bpomStatus).toBe("Berlaku");
  });

  it("returns not_found when NIE has zero records", async () => {
    globalThis.fetch = mockBpomFetch([]) as any;
    const result = await verifyBpomNie("NA99999999999");
    expect(result.nieFound).toBe(false);
    expect(result.status).toBe("not_found");
    expect(result.matchedProduct).toBeNull();
  });

  it("returns brand_mismatch when the NIE is owned by a different brand", async () => {
    globalThis.fetch = mockBpomFetch([
      {
        PRODUCT_REGISTER: "NA18261203080",
        PRODUCT_NAME: "Niacinamide 10% Serum",
        PRODUCT_BRANDS: "WARDAH",
        PRODUCT_PACKAGE: "Botol 30 mL",
        PRODUCT_FORM: "Cair",
        STATUS: "Berlaku",
      },
    ]) as any;
    const result = await verifyBpomNie("NA18261203080", "Somethinc");
    expect(result.nieFound).toBe(true);
    expect(result.status).toBe("brand_mismatch");
    expect(result.notes).toMatch(/Wardah/i);
  });

  it("returns expired when STATUS is not Berlaku", async () => {
    globalThis.fetch = mockBpomFetch([
      {
        PRODUCT_REGISTER: "NA18211900160",
        PRODUCT_NAME: "Old Product",
        PRODUCT_BRANDS: "Test Brand",
        PRODUCT_PACKAGE: "Botol 50 mL",
        PRODUCT_FORM: "Cair",
        STATUS: "Habis Berlaku",
      },
    ]) as any;
    const result = await verifyBpomNie("NA18211900160", "Test Brand");
    expect(result.nieFound).toBe(true);
    expect(result.status).toBe("expired");
    expect(result.bpomStatus).toBe("Habis Berlaku");
  });

  it("returns error when fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as any;
    const result = await verifyBpomNie("NA18261203080");
    expect(result.status).toBe("error");
    expect(result.notes).toMatch(/network down/);
  });
});

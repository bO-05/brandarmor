import { describe, expect, it } from "vitest";

describe("Brand Detail page route contract", () => {
  it("awaits Next route params before loading authenticated product baselines", async () => {
    const page = await import("../src/app/brands/[id]/page");
    const element = await page.default({ params: Promise.resolve({ id: "brand-neon-1" }) }) as unknown as { props: { brandId: string } };

    expect(element.props.brandId).toBe("brand-neon-1");
  });
});

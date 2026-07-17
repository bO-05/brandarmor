import { describe, expect, it } from "vitest";
import { formatDate } from "../src/lib/utils";

describe("date presentation", () => {
  it("uses Jakarta time consistently for server and client rendering", () => {
    const iso = "2026-07-17T00:00:00.000Z";
    const expected = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso));

    expect(formatDate(iso)).toBe(expected);
  });
});

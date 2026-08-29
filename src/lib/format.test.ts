import { describe, expect, it } from "vitest";
import { countLabel, formatDateRange, parseDate } from "./format";

describe("dates", () => {
  it("reads an API date as a local day, not as UTC midnight", () => {
    /* new Date("2026-03-04") is midnight UTC, which is March 3rd anywhere
       west of London — the trip would show as starting a day early. */
    const date = parseDate("2026-03-04")!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(4);
  });

  it("says a range inside one month once", () => {
    expect(formatDateRange("2026-03-04", "2026-03-18")).toBe("Mar 4 — 18");
  });

  it("names both months when the range crosses one", () => {
    expect(formatDateRange("2026-03-28", "2026-04-05")).toBe("Mar 28 — Apr 5");
  });

  it("carries the years when the range crosses one", () => {
    expect(formatDateRange("2026-12-28", "2027-01-05")).toBe("Dec 28, 2026 — Jan 5, 2027");
  });

  it("has something to say about a trip with no dates", () => {
    expect(formatDateRange(null, null)).toBe("No dates yet");
    expect(formatDateRange("2026-03-04", null)).toBe("From Mar 4");
  });
});

describe("counts", () => {
  it("gets the singular right", () => {
    expect(countLabel(1, "place")).toBe("1 place");
    expect(countLabel(0, "place")).toBe("0 places");
    expect(countLabel(14, "place")).toBe("14 places");
  });
});

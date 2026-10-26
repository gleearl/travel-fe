import { describe, expect, it } from "vitest";
import { countLabel, deviceName, formatDateRange, formatDay, initials, parseDate } from "./format";

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

describe("initials", () => {
  it("takes the first letter of the first and last name", () => {
    expect(initials("Glee Earl")).toBe("GE");
  });

  it("gives one letter to a one-word name", () => {
    expect(initials("Prince")).toBe("P");
  });

  it("skips the middle names rather than stacking up four letters", () => {
    /* An avatar is a circle about the size of a fingernail. Two letters is
       what fits. */
    expect(initials("Ana Maria Lopez Reyes")).toBe("AR");
  });

  it("is not confused by the spacing people actually type", () => {
    expect(initials("  ana   lopez  ")).toBe("AL");
  });

  it("works on a name that is not in the Latin alphabet", () => {
    expect(initials("陳 大文")).toBe("陳大");
    expect(initials("Ольга Иванова")).toBe("ОИ");
  });

  it("falls back to something rather than an empty circle", () => {
    /* A name should never be blank, but a blank avatar reads as a rendering
       failure, and "?" reads as a person we know nothing about. */
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("passkey details", () => {
  it("writes a timestamp as a day", () => {
    expect(formatDay("2026-10-26T09:00:00Z")).toBe("Oct 26, 2026");
    expect(formatDay(null)).toBe("");
  });

  it("names the device a passkey is being made on", () => {
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iPhone");
    expect(deviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("Mac");
    expect(deviceName("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe("Android phone");
    expect(deviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows PC");
    expect(deviceName("curl/8")).toBe("This device");
  });
});

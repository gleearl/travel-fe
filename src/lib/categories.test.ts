import { describe, expect, it } from "vitest";
import { BUILT_IN_KINDS, contrastOnPaper, KIND_SWATCHES, kindIn, withTripKinds } from "./categories";

describe("kinds of place", () => {
  const karaoke = { id: "k-karaoke1", label: "Karaoke", color: "#0f766e" };

  it("slots a trip's own kinds in before Other, which stays last", () => {
    const kinds = withTripKinds([karaoke]);

    expect(kinds.map((k) => k.id)).toEqual([...BUILT_IN_KINDS.slice(0, -1).map((k) => k.id), karaoke.id, "other"]);
    expect(kinds.find((k) => k.id === karaoke.id)?.custom).toBe(true);
  });

  it("draws a kind it cannot find as Other rather than a pin with no colour", () => {
    expect(kindIn(withTripKinds([karaoke]), "nightclub").id).toBe("other");
    expect(kindIn(withTripKinds([]), karaoke.id).id).toBe("other");
  });

  it("offers only colours dark enough to be read as text on paper", () => {
    for (const swatch of KIND_SWATCHES) expect(contrastOnPaper(swatch.color)).toBeGreaterThanOrEqual(4.5);
  });

  it("knows a pale colour is hard to read", () => {
    expect(contrastOnPaper("#f5d90a")).toBeLessThan(4.5);
    expect(contrastOnPaper("#1c1a17")).toBeCloseTo(16.7, 0);
  });
});

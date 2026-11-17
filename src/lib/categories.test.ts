import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, iconOf } from "./kindIcons";
import { BUILT_IN_KINDS, contrastOnPaper, KIND_SWATCHES, kindIn, withTripKinds } from "./categories";

describe("kinds of place", () => {
  const karaoke = { id: "k-karaoke1", label: "Karaoke", color: "#0f766e", icon: "microphone-stage" };

  it("slots a trip's own kinds in before Other, which stays last", () => {
    const kinds = withTripKinds([karaoke]);

    expect(kinds.map((k) => k.id)).toEqual([...BUILT_IN_KINDS.slice(0, -1).map((k) => k.id), karaoke.id, "other"]);
    expect(kinds.find((k) => k.id === karaoke.id)?.custom).toBe(true);
  });

  it("gives every built-in kind an icon the set has, and a trip's own kind a pin when its icon is unknown", () => {
    for (const kind of BUILT_IN_KINDS) expect(iconOf(kind.icon).id).toBe(kind.icon);

    const kinds = withTripKinds([karaoke, { ...karaoke, id: "k-2", label: "Old", icon: "retired-icon" }]);
    expect(kinds.find((k) => k.id === karaoke.id)?.icon).toBe("microphone-stage");
    expect(kinds.find((k) => k.id === "k-2")?.icon).toBe(FALLBACK_ICON);
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

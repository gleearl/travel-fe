import { describe, expect, it } from "vitest";
import type { Place } from "./api/types";
import { applyChanges, hasChanges, sharedValues } from "./bulk";

const place = (over: Partial<Place>): Place => ({
  id: 1,
  tripId: 7,
  name: "Somewhere",
  address: "",
  lat: 25,
  lng: 121,
  category: "food",
  tags: [],
  link: "",
  notes: "",
  visited: false,
  position: 1,
  addedBy: null,
  ...over,
});

describe("what several places have in common", () => {
  it("offers the kind and been-there only when every place agrees", () => {
    const same = sharedValues([place({ id: 1 }), place({ id: 2 })]);
    expect(same.category).toBe("food");
    expect(same.visited).toBe(false);

    const mixed = sharedValues([place({ id: 1 }), place({ id: 2, category: "cafe", visited: true })]);
    expect(mixed.category).toBeNull();
    expect(mixed.visited).toBeNull();
  });

  it("splits tags into ones on all of them and ones on only some", () => {
    const shared = sharedValues([
      place({ id: 1, tags: ["Street food", "Night market"] }),
      place({ id: 2, tags: ["street food", "Cash only"] }),
      place({ id: 3, tags: ["Street food", "Cash only"] }),
    ]);

    expect(shared.commonTags).toEqual(["Street food"]);
    expect(shared.partialTags).toEqual([
      { tag: "Cash only", count: 2 },
      { tag: "Night market", count: 1 },
    ]);
  });
});

describe("laying changes over a place", () => {
  it("adds tags without repeating one, and removes only what was asked", () => {
    const input = applyChanges(place({ tags: ["Street food", "Cash only"] }), {
      addTags: ["street food", "Late night"],
      removeTags: ["Cash only"],
    });

    expect(input.tags).toEqual(["Street food", "Late night"]);
  });

  it("keeps every field it was not told to change", () => {
    const input = applyChanges(place({ name: "Raohe", notes: "pepper buns", category: "cafe", visited: true }), {
      addTags: [],
      removeTags: [],
    });

    expect(input).toMatchObject({ name: "Raohe", notes: "pepper buns", category: "cafe", visited: true });
  });

  it("knows when there is nothing to save", () => {
    expect(hasChanges({ addTags: [], removeTags: [] })).toBe(false);
    expect(hasChanges({ addTags: [], removeTags: [], visited: true })).toBe(true);
  });
});

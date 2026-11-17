import { describe, expect, it } from "vitest";
import { iconOf, KIND_ICONS, suggestIcon } from "./kindIcons";

describe("suggesting an icon from a kind's name", () => {
  it("knows the kinds people add most", () => {
    expect(suggestIcon("Onsen")).toBe("drop");
    expect(suggestIcon("Karaoke")).toBe("microphone-stage");
    expect(suggestIcon("Ice cream")).toBe("ice-cream");
    expect(suggestIcon("Wine bar")).toBe("wine");
    expect(suggestIcon("Cocktail bars")).toBe("martini");
    expect(suggestIcon("Bakery")).toBe("cake");
    expect(suggestIcon("Ramen")).toBe("bowl-food");
    expect(suggestIcon("Temples")).toBe("bank");
  });

  it("suggests nothing for a name it doesn't recognise, or none at all", () => {
    expect(suggestIcon("Zzyzx")).toBeNull();
    expect(suggestIcon("  ")).toBeNull();
  });

  it("only ever suggests an icon the set has", () => {
    for (const word of ["onsen", "karaoke", "museum", "hotel", "market", "club", "gym", "beach"]) {
      const id = suggestIcon(word);
      expect(id && KIND_ICONS.some((icon) => icon.id === id)).toBe(true);
    }
    expect(iconOf("nonsense").id).toBe("map-pin");
  });
});

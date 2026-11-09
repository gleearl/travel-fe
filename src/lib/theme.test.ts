import { afterEach, describe, expect, it, vi } from "vitest";
import { initTheme, setThemePreference, THEME_KEY } from "./theme";
import { paintKind, withTripKinds } from "./categories";

function deviceIsDark(dark: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({ matches: dark, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("light or dark", () => {
  it("follows the device until a choice is made", () => {
    deviceIsDark(true);
    initTheme();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps a choice over the device's own setting", () => {
    deviceIsDark(true);
    setThemePreference("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("stores nothing for 'match device', so a cleared choice really is cleared", () => {
    deviceIsDark(false);
    setThemePreference("dark");
    setThemePreference("system");
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("a trip's own kind colours", () => {
  it("are drawn through the theme's lift but edited as the hex they were saved with", () => {
    const [karaoke] = withTripKinds([{ id: "k1", label: "Karaoke", color: "#0f766e" }]).filter((k) => k.custom);
    expect(karaoke.hex).toBe("#0f766e");
    expect(karaoke.color).toBe(paintKind("#0f766e"));
    expect(karaoke.color).toContain("var(--kind-lift)");
  });

  it("leave the built-in kinds to their own dark values", () => {
    expect(paintKind("var(--color-food)")).toBe("var(--color-food)");
  });
});

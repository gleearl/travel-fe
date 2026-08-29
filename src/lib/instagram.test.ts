import { describe, expect, it } from "vitest";
import { suggestPlaceName } from "./instagram";

describe("naming a place after its Instagram account", () => {
  it("turns a username into something that reads like a name", () => {
    expect(suggestPlaceName("https://instagram.com/fuglen.coffee")).toBe("Fuglen Coffee");
  });

  it("copes with the shapes a link arrives in", () => {
    expect(suggestPlaceName("https://www.instagram.com/fuglen.coffee/")).toBe("Fuglen Coffee");
    expect(suggestPlaceName("instagram.com/fuglen.coffee")).toBe("Fuglen Coffee");
    expect(suggestPlaceName("https://instagram.com/blue_bottle_japan/?igsh=MXY4")).toBe("Blue Bottle Japan");
    expect(suggestPlaceName("@narisawa_tokyo")).toBe("Narisawa Tokyo");
  });

  it("leaves a username it cannot split alone rather than mangling it", () => {
    /* Nobody can tell "asakusa" out of "fuglenasakusa" without knowing Tokyo.
       Capitalised and handed over is better than a wrong guess. */
    expect(suggestPlaceName("https://instagram.com/fuglenasakusa")).toBe("Fuglenasakusa");
  });

  it("has nothing to say about a link that names no account", () => {
    expect(suggestPlaceName("https://www.instagram.com/p/C8QltIhy1Xs/")).toBeNull();
    expect(suggestPlaceName("https://instagram.com/reel/C8Qlt/")).toBeNull();
    expect(suggestPlaceName("https://tiktok.com/@someone")).toBeNull();
    expect(suggestPlaceName("")).toBeNull();
  });
});

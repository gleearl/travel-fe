import { beforeEach, describe, expect, it, vi } from "vitest";
import { reveal } from "./reveal";

/* jsdom has no layout: every box is 0×0 and nothing scrolls. The geometry is
   the whole of what `reveal` does, so the test supplies it — a scroller 400px
   tall on screen, and a card placed wherever the case needs it. */
function scene({
  card,
  hidden = 0,
}: {
  card: { top: number; bottom: number };
  hidden?: number;
}) {
  const scroller = document.createElement("div");
  scroller.style.overflowY = "auto";
  if (hidden) scroller.style.setProperty("--hidden-bottom", `${hidden}px`);
  Object.defineProperty(scroller, "scrollHeight", { value: 2000 });
  Object.defineProperty(scroller, "clientHeight", { value: 400 });
  scroller.getBoundingClientRect = () => ({ top: 100, bottom: 500 }) as DOMRect;

  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top: card.top, bottom: card.bottom }) as DOMRect;
  scroller.append(el);
  document.body.append(scroller);

  const scrollBy = vi.fn();
  scroller.scrollBy = scrollBy;
  return { el, scrollBy };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("reveal", () => {
  it("leaves a card that is already in view alone", () => {
    const { el, scrollBy } = scene({ card: { top: 200, bottom: 300 } });
    reveal(el);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("scrolls up to a card above the top", () => {
    const { el, scrollBy } = scene({ card: { top: 40, bottom: 140 } });
    reveal(el);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 40 - 110 }));
  });

  it("scrolls down to a card below the bottom", () => {
    const { el, scrollBy } = scene({ card: { top: 600, bottom: 700 } });
    reveal(el);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 700 - 490 }));
  });

  /* The sheet at half height hangs its lower part off the screen. A card
     sitting in that strip counts as hidden even though the scroller's own
     box says it is inside. */
  it("counts the part of the scroller below the window as out of view", () => {
    const { el, scrollBy } = scene({ card: { top: 380, bottom: 460 }, hidden: 200 });
    reveal(el);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 460 - 290 }));
  });

  /* Taller than the window: showing the end of it and none of the name would
     be worse than showing the start. */
  it("prefers the top of a card too tall to fit", () => {
    const { el, scrollBy } = scene({ card: { top: 300, bottom: 900 } });
    reveal(el);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 300 - 110 }));
  });

  it("does nothing when no ancestor scrolls", () => {
    const el = document.createElement("div");
    document.body.append(el);
    expect(() => reveal(el)).not.toThrow();
  });
});

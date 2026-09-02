/** A little air between a revealed card and the edge it was brought in from. */
const MARGIN = 10;

/** The nearest ancestor that actually scrolls, or null if nothing does. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/* Bring an element into view inside its own scroller, and no further.

   `scrollIntoView` would do most of this, but it scrolls every scrollable
   ancestor rather than just the list, and it has no way to say "prefer the top
   of the card" for a card taller than the window — which is what a place with
   long notes is on a phone. */
export function reveal(el: HTMLElement) {
  const scroller = scrollerOf(el);
  if (!scroller) return;

  /* A sheet dragged part-way down keeps its full height and hangs the rest of
     itself below the window. The scroller's own bottom edge is then not where
     looking at it stops, so it says how much of itself is out of sight. */
  const hidden = Number.parseFloat(getComputedStyle(scroller).getPropertyValue("--hidden-bottom")) || 0;

  const box = el.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();

  const above = box.top - (view.top + MARGIN);
  const below = box.bottom - (view.bottom - hidden - MARGIN);

  /* Already whole and in view: leave the list exactly where the reader put it.
     Otherwise move by the smaller of the two corrections, so a card that is
     too tall to fit lands with its top showing rather than its bottom. */
  if (above >= 0 && below <= 0) return;
  const by = above < 0 ? above : Math.min(below, above);

  scroller.scrollBy({ top: by, behavior: "smooth" });
}

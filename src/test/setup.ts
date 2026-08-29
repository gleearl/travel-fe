import "@testing-library/jest-dom/vitest";

/* jsdom has no layout, so anything that measures the viewport measures zero.
   The bottom sheet snaps to fractions of the window height, which would make
   every stop identical — this gives it a phone to work with. */
Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 812 });
Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });

/* Pointer capture is how the sheet keeps receiving moves once a drag leaves
   the handle. jsdom implements the events but none of the capture methods. */
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

/* Components ask this before animating. jsdom answers nothing at all. */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

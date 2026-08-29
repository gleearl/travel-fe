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

/* Leaflet needs a real box to draw a map into and a canvas to draw tiles on;
   in jsdom it has neither. Every test that renders a screen containing the map
   is testing the screen, not the map, so the whole library is replaced with
   something that renders its children and reports what it was asked to show.
   The map's own behaviour is verified in the browser instead. */
vi.mock("react-leaflet", async () => {
  const { createElement } = await import("react");

  return {
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
      createElement("div", { "data-testid": "map" }, children),
    TileLayer: () => null,
    AttributionControl: () => null,
    Marker: ({ children, eventHandlers, ...rest }: Record<string, unknown>) =>
      createElement(
        "button",
        {
          "data-testid": "pin",
          "data-title": (rest as { title?: string }).title,
          onClick: (eventHandlers as { click?: () => void } | undefined)?.click,
        },
        children as React.ReactNode,
      ),
    Popup: ({ children }: { children?: React.ReactNode }) => createElement("div", null, children),
    useMap: () => ({ setView: () => {}, fitBounds: () => {}, flyTo: () => {} }),
    useMapEvents: () => null,
  };
});

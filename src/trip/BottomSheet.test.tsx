import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet, type Snap } from "./BottomSheet";

/* window.innerHeight is 812 in the test setup, so the sheet is 747px tall and
   its stops are: full 0, half 341, peek 599. */
function offsetOf(element: HTMLElement): number {
  const match = /translateY\((-?[\d.]+)px\)/.exec(element.style.transform);
  return match ? Number(match[1]) : NaN;
}

function Harness({ initial = "half" as Snap }) {
  const [snap, setSnap] = useState<Snap>(initial);
  return (
    <BottomSheet label="Places" snap={snap} onSnapChange={setSnap}>
      <p>the list</p>
    </BottomSheet>
  );
}

const sheet = () => screen.getByRole("region", { name: "Places" });

describe("the three stops", () => {
  it("sits at the half stop by default", () => {
    render(<Harness />);
    expect(offsetOf(sheet())).toBeCloseTo(812 * 0.92 - 812 * 0.5, 0);
  });

  it("covers the screen at full", () => {
    render(<Harness initial="full" />);
    expect(offsetOf(sheet())).toBe(0);
  });

  it("leaves a card's worth showing at peek", () => {
    render(<Harness initial="peek" />);
    expect(offsetOf(sheet())).toBeCloseTo(812 * 0.92 - 148, 0);
  });
});

describe("without a pointer", () => {
  it("opens and closes from the handle, for anyone using a keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness initial="peek" />);

    const handle = screen.getByRole("button", { name: "Expand the list" });
    expect(handle).toHaveAttribute("aria-expanded", "false");

    await user.click(handle);

    expect(offsetOf(sheet())).toBe(0);
    expect(screen.getByRole("button", { name: "Collapse the list" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("dragging", () => {
  /* Two moves, because velocity is measured between them: the first covers
     the distance, the second is what the pointer was doing when it left. */
  const drag = (from: number, to: number, { flick = false } = {}) => {
    const handle = sheet().querySelector("header")!;
    act(() => {
      handle.dispatchEvent(pointer("pointerdown", from, 0));
      handle.dispatchEvent(pointer("pointermove", to, 200));
      if (flick) {
        handle.dispatchEvent(pointer("pointermove", to + 60, 208));
        handle.dispatchEvent(pointer("pointerup", to + 60, 212));
      } else {
        handle.dispatchEvent(pointer("pointermove", to + 1, 340));
        handle.dispatchEvent(pointer("pointerup", to + 1, 360));
      }
    });
  };

  it("settles at the nearest stop when let go slowly", () => {
    render(<Harness initial="full" />);

    // Most of the way to half (341px), let go without a flick.
    drag(100, 400);

    expect(offsetOf(sheet())).toBeCloseTo(812 * 0.92 - 812 * 0.5, 0);
  });

  it("takes a flick as a decision, not as a position", () => {
    render(<Harness initial="full" />);

    // Barely moved from the top, but thrown downward on the way out.
    drag(100, 160, { flick: true });

    expect(offsetOf(sheet())).toBeCloseTo(812 * 0.92 - 812 * 0.5, 0);
  });

  it("never lets the sheet be dragged off the top of the screen", () => {
    render(<Harness initial="full" />);

    drag(400, -900);

    expect(offsetOf(sheet())).toBe(0);
  });
});

/* jsdom has no PointerEvent, and its MouseEvent carries no pointerId. */
function pointer(type: string, clientY: number, timeStamp: number): Event {
  const event = new MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  return event;
}

vi.mock("../lib/useMediaQuery", () => ({ useMediaQuery: () => false, DESKTOP: "" }));

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";
import { Field } from "./Field";

/* A sheet with a screen behind it that re-renders on its own — which is what
   the five-second poll for updates does to every screen in the app. Nothing
   here touches focus: `tick` is called straight out of the test. */
function Harness({
  onClose = () => {},
  onReady,
}: {
  onClose?: () => void;
  onReady?: (tick: () => void) => void;
}) {
  const [, setTicks] = useState(0);
  onReady?.(() => setTicks((n) => n + 1));

  return (
    /* A fresh arrow on every render, as every real caller passes. */
    <Sheet title="Add a place" onClose={() => onClose()}>
      <Field label="Place" />
      <Field label="Address" />
    </Sheet>
  );
}

/** Re-render the screen behind, the way an answer from the poll would. */
function renderSheet(props: { onClose?: () => void } = {}) {
  let tick = () => {};
  render(<Harness {...props} onReady={(fn) => (tick = fn)} />);
  return () => act(() => tick());
}

describe("where focus lands", () => {
  it("starts in the first field, not on Close", () => {
    renderSheet();
    expect(screen.getByLabelText("Place")).toHaveFocus();
  });

  it("starts on Close when the sheet has no fields", () => {
    render(
      <Sheet title="Nothing to fill in" onClose={() => {}}>
        <p>Just a message.</p>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});

describe("focus while the screen behind re-renders", () => {
  it("leaves the caret in the field being typed in", async () => {
    const user = userEvent.setup();
    const tick = renderSheet();

    const address = screen.getByLabelText("Address");
    await user.click(address);
    await user.type(address, "2-6-15 Asakusa");

    tick();

    expect(address).toHaveFocus();
    expect(address).toHaveValue("2-6-15 Asakusa");
  });

  it("still closes on Escape afterwards", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const tick = renderSheet({ onClose });

    tick();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

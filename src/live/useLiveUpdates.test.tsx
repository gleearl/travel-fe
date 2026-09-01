import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../lib/api/types";
import type { Updates } from "../lib/api/updates";
import { LiveUpdatesProvider, useChanged, useLiveUpdates } from "./useLiveUpdates";

vi.mock("../lib/api/updates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api/updates")>()),
  fetchUpdates: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({ useAuth: () => ({ user: signedInAs }) }));

import { fetchUpdates } from "../lib/api/updates";

const asMock = fetchUpdates as unknown as ReturnType<typeof vi.fn>;

let signedInAs: User | null = null;

const INTERVAL = 5000;

const digest = (at: number): Updates => ({
  trips: { 7: at },
  invitations: { count: 0, latest: null },
});

/** Whatever the provider is currently holding, as text to assert on. */
function Readout() {
  const { updates } = useLiveUpdates();
  return <span data-testid="stamp">{updates === null ? "none" : String(updates.trips[7])}</span>;
}

/* Wrapped in act because the answer to a poll lands in React state, and a
   promise resolving inside a timer is exactly the update React asks to be told
   about before anything reads the rendered output. */
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const visibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  vi.useFakeTimers();
  signedInAs = { id: 1, name: "Ada", email: "ada@example.com" };
  visibility("visible");
  asMock.mockReset();
  asMock.mockResolvedValue(digest(100));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the poller", () => {
  it("does not ask at all until somebody is signed in", async () => {
    signedInAs = null;
    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    await tick(INTERVAL * 3);
    expect(asMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("stamp")).toHaveTextContent("none");
  });

  it("asks on an interval once signed in, and passes on what it hears", async () => {
    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    // Nothing on mount: the screens have just fetched for themselves.
    expect(asMock).not.toHaveBeenCalled();

    await tick(INTERVAL);
    expect(asMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("stamp")).toHaveTextContent("100");

    asMock.mockResolvedValue(digest(200));
    await tick(INTERVAL);
    expect(asMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("stamp")).toHaveTextContent("200");
  });

  it("stops asking while the tab is in the background", async () => {
    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    await tick(INTERVAL);
    expect(asMock).toHaveBeenCalledTimes(1);

    visibility("hidden");
    await tick(INTERVAL * 5);
    expect(asMock).toHaveBeenCalledTimes(1);
  });

  it("asks straight away when the tab is looked at again", async () => {
    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    visibility("hidden");
    await tick(INTERVAL * 2);
    expect(asMock).not.toHaveBeenCalled();

    // Not after the rest of a tick — now, so coming back is never stale.
    visibility("visible");
    await tick(0);
    expect(asMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the last answer when a poll fails, rather than emptying out", async () => {
    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    await tick(INTERVAL);
    expect(screen.getByTestId("stamp")).toHaveTextContent("100");

    asMock.mockRejectedValue(new Error("offline"));
    await tick(INTERVAL);

    // A blip must not read as every trip having been deleted.
    expect(screen.getByTestId("stamp")).toHaveTextContent("100");

    asMock.mockResolvedValue(digest(300));
    await tick(INTERVAL);
    expect(screen.getByTestId("stamp")).toHaveTextContent("300");
  });

  it("never has two asks in the air at once", async () => {
    // A slow answer: an interval would stack the next one on top of it.
    let release: (value: Updates) => void = () => {};
    asMock.mockImplementation(() => new Promise<Updates>((resolve) => (release = resolve)));

    render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    await tick(INTERVAL * 4);
    expect(asMock).toHaveBeenCalledTimes(1);

    release(digest(100));
    await tick(INTERVAL);
    expect(asMock).toHaveBeenCalledTimes(2);
  });

  it("stops when the component goes away", async () => {
    const { unmount } = render(
      <LiveUpdatesProvider>
        <Readout />
      </LiveUpdatesProvider>,
    );

    await tick(INTERVAL);
    unmount();
    await tick(INTERVAL * 5);
    expect(asMock).toHaveBeenCalledTimes(1);
  });
});

describe("useChanged", () => {
  function Watcher({ value, onChange }: { value: string | number | null; onChange: () => void }) {
    useChanged(value, onChange);
    return null;
  }

  it("adopts the first value it sees without acting on it", () => {
    const onChange = vi.fn();
    render(<Watcher value={1} onChange={onChange} />);

    // The screen already fetched; the first digest describes what it shows.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("runs once when the value moves, and not while it holds still", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Watcher value={1} onChange={onChange} />);

    rerender(<Watcher value={2} onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<Watcher value={2} onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<Watcher value={3} onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("treats nothing-known-yet as no change at all", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Watcher value={null} onChange={onChange} />);

    rerender(<Watcher value={null} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    // The first real value is still only adopted, never acted on.
    rerender(<Watcher value={5} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    rerender(<Watcher value={6} onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

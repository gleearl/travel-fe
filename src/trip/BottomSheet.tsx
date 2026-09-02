import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/* The list of places, over the map, on a phone.

   Three stops rather than open/closed: peeking shows the selected place while
   leaving the map whole, half is the reading position, and full is the list.
   Tapping a pin snaps to peek; dragging goes wherever you put it.

   Hand-rolled on Pointer Events. A drag library would bring its own gesture
   model and its own bundle for what is one axis and three numbers.
*/

export type Snap = "peek" | "half" | "full";

/** Enough for the handle, the count line, and one card. */
const PEEK_PX = 148;
const HEIGHT = 0.92;
const HALF = 0.5;

export function BottomSheet({
  snap,
  onSnapChange,
  children,
  label,
}: {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  children: ReactNode;
  label: string;
}) {
  const [height, setHeight] = useState(() => window.innerHeight * HEIGHT);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  /* The live drag lives in a ref, not in state. Two pointer events can land
     in one React batch — a move and the up that follows it — and a handler
     reading `dragOffset` would then see the position from before the move and
     settle the sheet at the wrong stop. */
  const drag = useRef<{
    startY: number;
    startOffset: number;
    offset: number;
    lastY: number;
    lastAt: number;
    velocity: number;
  } | null>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight * HEIGHT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** How far down the sheet sits for each stop, in pixels from the top of it. */
  const offsetFor = useCallback(
    (which: Snap): number => {
      if (which === "full") return 0;
      if (which === "half") return height - window.innerHeight * HALF;
      return height - PEEK_PX;
    },
    [height],
  );

  const nearest = useCallback(
    (offset: number, velocity: number): Snap => {
      /* A flick beats proximity: throwing the sheet down should close it even
         from an inch off the top. 0.5 px/ms is about a deliberate flick. */
      if (velocity > 0.5) return snap === "full" ? "half" : "peek";
      if (velocity < -0.5) return snap === "peek" ? "half" : "full";

      const stops: Snap[] = ["full", "half", "peek"];
      return stops.reduce((best, which) =>
        Math.abs(offsetFor(which) - offset) < Math.abs(offsetFor(best) - offset) ? which : best,
      );
    },
    [offsetFor, snap],
  );

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      startY: event.clientY,
      startOffset: offsetFor(snap),
      offset: offsetFor(snap),
      lastY: event.clientY,
      lastAt: event.timeStamp,
      velocity: 0,
    };
    setDragOffset(offsetFor(snap));
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state) return;

    const offset = clamp(state.startOffset + (event.clientY - state.startY), 0, offsetFor("peek"));
    const elapsed = Math.max(event.timeStamp - state.lastAt, 1);

    state.offset = offset;
    state.velocity = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastAt = event.timeStamp;
    setDragOffset(offset);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state) return;

    /* A pointer that came to rest before lifting was placing the sheet, not
       throwing it — so speed only counts if the release follows the last move
       closely. */
    const paused = event.timeStamp - state.lastAt > 120;
    const settled = nearest(state.offset, paused ? 0 : state.velocity);

    drag.current = null;
    setDragOffset(null);
    onSnapChange(settled);
  }

  /* Scrolling the list back to the top on the way down: reopening at peek
     halfway through the list would look like the wrong place was selected. */
  useEffect(() => {
    if (snap === "peek" && body.current) body.current.scrollTop = 0;
  }, [snap]);

  const offset = dragOffset ?? offsetFor(snap);

  return (
    <section
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-sheet bg-paper shadow-sheet"
      style={{
        height: `${HEIGHT * 100}dvh`,
        transform: `translateY(${offset}px)`,
        transition: dragOffset === null ? "transform 0.32s var(--ease-settle)" : "none",
      }}
    >
      {/* The whole strip drags, not just the bar: on a phone the bar alone is
          a smaller target than a thumb. */}
      <header
        className="shrink-0 cursor-grab touch-none px-4 pt-2.5 pb-1 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          /* The keyboard's way through the same three stops — a drag handle
             nobody can drag is a control only some people have. */
          onClick={() => onSnapChange(snap === "full" ? "peek" : "full")}
          aria-expanded={snap === "full"}
          aria-label={snap === "full" ? "Collapse the list" : "Expand the list"}
          className="mx-auto flex h-6 w-16 items-center justify-center"
        >
          <span className="h-1 w-10 rounded-pill bg-rule-strong" />
        </button>
      </header>

      {/* The sheet keeps its full height at every stop and hangs the rest of
          itself below the window, so at peek and half the last stretch of the
          list sits off the bottom of the screen where no amount of scrolling
          reaches it. Padding the run of the list by exactly that much gives
          the last card somewhere to go — and `--hidden-bottom` tells anything
          scrolling a card into view where looking actually stops.

          Both take the settled stop rather than the live drag: resizing the
          run of the list on every pointer move would relayout the whole list
          under the thumb, and the padding is below the content anyway, so
          dragging up still uncovers cards rather than blank paper. */}
      <div
        ref={body}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        style={
          {
            "--hidden-bottom": `${offsetFor(snap)}px`,
            paddingBottom: `calc(max(1.5rem, env(safe-area-inset-bottom)) + ${offsetFor(snap)}px)`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

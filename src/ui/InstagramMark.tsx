/* Instagram's mark, drawn rather than fetched: a remote SVG would be a third
   party watching every card scroll past, for one glyph we can draw in a dozen
   lines.

   The link field takes any URL, but what people paste is nearly always the reel
   that put the place on the list — so the mark stands in for "the post", and
   the accessible name on the link says whose post it actually is. */
export function InstagramMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

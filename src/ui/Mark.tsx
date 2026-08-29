/* The app's own mark: a route between two points, drawn once and used on the
   sign-in screens and in the header. Not a logo anyone commissioned — a line
   with two stops on it, which is what a trip is. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M7 24c0-6 5-4 5-9s-4-3-4-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.5 3.5"
        opacity="0.55"
      />
      <path
        d="M12 15c3.5 0 4 3 8 3s5-4 5-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.5 3.5"
        opacity="0.55"
      />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <path d="M25 10.5c0 2.5-3 5.5-3 5.5s-3-3-3-5.5a3 3 0 116 0z" fill="currentColor" />
    </svg>
  );
}

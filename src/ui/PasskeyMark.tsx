/* A key with a person's outline in its bow: the shape the platforms use for
   passkeys, so it matches what the device shows when it asks. */
export function PasskeyMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="5" r="2.5" />
      <path d="M2 14.5c0-2.6 2-4.5 4.5-4.5 1.2 0 2.2.4 3 1" />
      <circle cx="13" cy="9.5" r="2" />
      <path d="M13 11.5v4.5M13 14h1.5" />
    </svg>
  );
}

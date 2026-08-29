/* ==========================================================================
   Naming a place after the Instagram account you found it on.

   Nothing is fetched. Instagram serves the same empty script shell for every
   profile, to every user-agent, so the username in the link is the only thing
   a link can tell you. Tidied up it is usually the name of the place, and when
   it is not it is a starting point you can type over.
   ========================================================================== */

/** Paths that belong to Instagram itself rather than to somebody. */
const RESERVED = new Set([
  "p", "reel", "reels", "explore", "stories", "tv", "s",
  "accounts", "direct", "about", "developer", "legal",
]);

/** The place name an Instagram link suggests, if it names an account at all. */
export function suggestPlaceName(input: string): string | null {
  const handle = handleFrom(input);

  if (handle === null) return null;

  /* Only the separators people actually put in a username. A run of letters
     with no break in it stays as it is: "fuglenasakusa" cannot be split into
     "fuglen asakusa" without knowing that Asakusa is part of Tokyo, and a
     wrong split reads worse than no split. */
  const words = handle.split(/[._-]+/).filter(Boolean);

  if (words.length === 0) return null;

  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function handleFrom(input: string): string | null {
  const trimmed = input.trim().replace(/^@/, "");

  if (trimmed === "") return null;

  // Typed rather than pasted: a bare username with no link around it.
  if (/^[A-Za-z0-9._]+$/.test(trimmed)) return trimmed.toLowerCase();

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;

  const [first] = url.pathname.split("/").filter(Boolean);

  /* A post or a reel carries a shortcode, not a name. There is nothing in
     "C8QltIhy1Xs" worth writing on a card. */
  return first && !RESERVED.has(first.toLowerCase()) ? first.toLowerCase() : null;
}

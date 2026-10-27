import { createContext, useContext, useMemo, type ReactNode } from "react";
import { BUILT_IN_KINDS, kindIn, type Kind } from "./categories";

/* The kinds of place on the trip being looked at, for every chip, card and pin
   under it — so none of them needs the trip handed down to know what colour a
   place is. Outside a trip only the built-in kinds exist. */
const KindsContext = createContext<readonly Kind[]>(BUILT_IN_KINDS);

/** `kinds` is the whole list, from withTripKinds. */
export function KindsProvider({ kinds, children }: { kinds: readonly Kind[]; children: ReactNode }) {
  return <KindsContext.Provider value={kinds}>{children}</KindsContext.Provider>;
}

export function useKinds() {
  const kinds = useContext(KindsContext);
  return useMemo(() => ({ kinds, kindOf: (id: string | null | undefined) => kindIn(kinds, id) }), [kinds]);
}

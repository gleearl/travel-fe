import type { Kind } from "../categories";
import { iconOf } from "../kindIcons";
import { request, unwrap } from "./http";

/* A trip's own kinds of place. Each answer is the one kind it was about; the
   trip screen puts it into the trip it already has, and everyone else on the
   trip hears about it through /api/updates. */

export function toKind(raw: Record<string, unknown>): Kind {
  return {
    id: String(raw.id),
    label: String(raw.label ?? ""),
    // Null on a restyled built-in kind that keeps its own colour.
    color: typeof raw.color === "string" ? raw.color : "",
    // Kinds saved before icons existed come back without one.
    icon: iconOf(typeof raw.icon === "string" ? raw.icon : null).id,
  };
}

/** Always a list, whatever an older API sends — or doesn't. */
export function toKinds(value: unknown): Kind[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]).map(toKind) : [];
}

export interface KindInput {
  /** Ignored for a built-in kind, whose name stays. */
  label: string;
  /** Null keeps a built-in kind's own colour. */
  color: string | null;
  icon: string;
}

export async function createKind(tripId: number, input: KindInput): Promise<Kind> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/trips/${tripId}/kinds`, {
    method: "POST",
    body: input,
  });
  return toKind(unwrap(payload));
}

export async function updateKind(tripId: number, id: string, input: KindInput): Promise<Kind> {
  const payload = await request<{ data: Record<string, unknown> }>(
    `/api/trips/${tripId}/kinds/${encodeURIComponent(id)}`,
    { method: "PUT", body: input },
  );
  return toKind(unwrap(payload));
}

/** Its places go back to Other on the server; the caller does the same locally.
 *  For a built-in kind this only takes its restyle away. */
export async function deleteKind(tripId: number, id: string): Promise<void> {
  await request<void>(`/api/trips/${tripId}/kinds/${encodeURIComponent(id)}`, { method: "DELETE" });
}

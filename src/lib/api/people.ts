import type { Collaborator, Person, TripRole } from "./types";

/* Reading people off the wire. Shared by trips and places, both of which name
   somebody, and neither of which should each grow its own idea of how. */

const ROLES: readonly TripRole[] = ["owner", "editor", "viewer"];

/**
 * A role this build has never heard of becomes "viewer".
 *
 * Deliberately the cautious direction: an unknown role must never be read as
 * permission to change things.
 */
export function toRole(value: unknown, fallback: TripRole = "viewer"): TripRole {
  return ROLES.includes(value as TripRole) ? (value as TripRole) : fallback;
}

export function toPerson(raw: unknown): Person | null {
  if (raw === null || typeof raw !== "object") return null;

  const person = raw as Record<string, unknown>;

  return { id: Number(person.id), name: String(person.name ?? "") };
}

export function toCollaborator(raw: Record<string, unknown>): Collaborator {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    role: toRole(raw.role),
    ...(typeof raw.email === "string" ? { email: raw.email } : {}),
  };
}

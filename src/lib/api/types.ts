import type { Category } from "../categories";

export interface User {
  id: number;
  name: string;
  email: string;
}

/** What you may do with a trip. Mirrors the API's App\Enums\TripRole. */
export type TripRole = "owner" | "editor" | "viewer";

/** Somebody, as the app draws them. Initials are worked out from `name`. */
export interface Person {
  id: number;
  name: string;
}

export interface Collaborator extends Person {
  role: TripRole;
  /** Only ever sent to the owner; absent for everyone else. */
  email?: string;
}

/** An invitation sent but not yet taken up. Only the owner is shown these. */
export interface Invitation {
  id: number;
  email: string;
  role: TripRole;
  expiresAt: string;
}

/** What an invitation link resolves to, read before anyone has signed in. */
export interface InvitationPreview {
  tripName: string;
  invitedBy: string;
  role: TripRole;
  email: string;
  /** Whether that address already has an account, so we offer the right door. */
  hasAccount: boolean;
}

export interface Trip {
  id: number;
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  startDate: string | null;
  endDate: string | null;
  placeCount: number;
  /** What *you* may do here. Every control on the trip screen reads this. */
  role: TripRole;
  /** Who created it. Null only on a response that predates sharing. */
  owner: Person | null;
  /** Everyone else on it, for the avatar stack. */
  collaborators: Collaborator[];
  /** Only on the detail call; the list never carries them. */
  places: Place[];
}

export interface Place {
  id: number;
  tripId: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  link: string;
  notes: string;
  visited: boolean;
  position: number;
  /** Who put it on the list. Null once that account is gone. */
  addedBy: Person | null;
}

/** What a trip form sends. Dates are "YYYY-MM-DD" or empty. */
export interface TripInput {
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  startDate: string;
  endDate: string;
}

export interface PlaceInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  link: string;
  notes: string;
  visited: boolean;
}

/** A result from the geocoder, before it becomes a place. */
export interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

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

/**
 * Somebody asked onto a trip, waiting to answer.
 *
 * Read from both ends: the owner sees it in the people sheet and cares about
 * `user`, while the invited account sees it on their trips list and cares
 * about `trip` and `invitedBy`.
 */
export interface Invitation {
  id: number;
  role: TripRole;
  /** Who was asked. */
  user: Person | null;
  /** Who asked them. */
  invitedBy: Person | null;
  /** Enough to draw the card without opening a trip you cannot open yet. */
  trip: {
    id: number;
    name: string;
    destination: string;
    startDate: string | null;
    endDate: string | null;
  };
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

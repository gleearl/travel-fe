import type { Category } from "../categories";

export interface User {
  id: number;
  name: string;
  email: string;
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

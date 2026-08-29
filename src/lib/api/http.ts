/* ==========================================================================
   Every call to the API goes through here.

   Auth is a bearer token this module holds and attaches. It is not a cookie:
   the app is served from github.io and the API from another host, so a session
   cookie between them would be third-party and dropped by the browser.

   The trade that comes with a token is that it lives in localStorage, where a
   script running on this origin could read it. This app loads no third-party
   script, and the alternative — a cookie that never arrives — is not one.
   ========================================================================== */

import { API_URL } from "../../config";

const TOKEN_KEY = "fieldguide.token";

/** Raised when a session ends mid-use, so the app can send you to the door
 *  rather than showing an error you can't act on. */
export const SESSION_ENDED = "fieldguide:session-ended";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Laravel's 422 shape: one field, many messages. */
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The first thing wrong with a named field, if anything is. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    /* Private mode, or storage the browser refuses. Signing in still works
       for as long as the tab is open; it just won't be remembered. */
    return memoryToken;
  }
}

let memoryToken: string | null = null;

export function setToken(token: string): void {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* Nothing to do — memoryToken above is the fallback. */
  }
}

export function clearToken(): void {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* As above. */
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** For the calls where a 401 is an answer rather than an accident — asking
   *  who is signed in when nobody is. */
  allowUnauthorized?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, allowUnauthorized = false } = options;
  const token = getToken();

  const response = await fetch(API_URL + path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !allowUnauthorized) {
      /* The token is gone or no longer good. Drop it and say so once —
         leaving it in place would mean every later call fails the same way. */
      clearToken();
      window.dispatchEvent(new Event(SESSION_ENDED));
    }

    throw new ApiError(
      response.status,
      (payload as { message?: string } | null)?.message ?? "Something went wrong.",
      (payload as { errors?: Record<string, string[]> } | null)?.errors ?? {},
    );
  }

  return payload as T;
}

/** Laravel wraps resources in `data`; the callers here only want the inside. */
export function unwrap<T>(payload: { data?: T } | T): T {
  return (payload as { data?: T })?.data ?? (payload as T);
}

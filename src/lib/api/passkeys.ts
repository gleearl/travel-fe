import {
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { request, setToken, unwrap } from "./http";
import type { Passkey, User } from "./types";

/* Passkeys: a ceremony is two calls with the device in between. The API hands
   out a challenge and a ceremony id; the browser has the device sign it; the
   signed answer goes back with the same id. */

interface Ceremony<T> {
  ceremony: string;
  options: T;
}

/**
 * Sign in with whichever passkey the person picks.
 *
 * With `autofill`, nothing is shown until they focus the email field and
 * choose a passkey from the browser's suggestions. The request then simply
 * waits, and is abandoned by `cancelPasskeyPrompt` when the page moves on.
 */
export async function signInWithPasskey({ autofill = false } = {}): Promise<User> {
  const { ceremony, options } = await request<Ceremony<PublicKeyCredentialRequestOptionsJSON>>(
    "/api/passkeys/sign-in/options",
    { method: "POST", allowUnauthorized: true },
  );

  const credential = await startAuthentication({ optionsJSON: options, useBrowserAutofill: autofill });

  const payload = await request<{ token: string; user: User }>("/api/passkeys/sign-in", {
    method: "POST",
    body: { ceremony, credential },
    allowUnauthorized: true,
  });

  setToken(payload.token);
  return payload.user;
}

/** Stops a waiting autofill request, so a password sign-in is not raced by it. */
export function cancelPasskeyPrompt(): void {
  WebAuthnAbortService.cancelCeremony();
}

export async function listPasskeys(): Promise<Passkey[]> {
  const payload = await request<{ data: Record<string, unknown>[] }>("/api/passkeys");
  return unwrap(payload).map(toPasskey);
}

/** Has this device make a passkey for the signed-in account, and keeps it. */
export async function addPasskey(name: string): Promise<Passkey> {
  const { ceremony, options } = await request<Ceremony<PublicKeyCredentialCreationOptionsJSON>>(
    "/api/passkeys/options",
    { method: "POST" },
  );

  const credential = await startRegistration({ optionsJSON: options });

  const payload = await request<{ data: Record<string, unknown> }>("/api/passkeys", {
    method: "POST",
    body: { ceremony, credential, name },
  });

  return toPasskey(unwrap(payload));
}

export async function removePasskey(id: number): Promise<void> {
  await request<void>(`/api/passkeys/${id}`, { method: "DELETE" });
}

function toPasskey(raw: Record<string, unknown>): Passkey {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    createdAt: (raw.created_at as string) ?? null,
    lastUsedAt: (raw.last_used_at as string) ?? null,
  };
}

/**
 * The person closed the prompt, took too long, or the request was abandoned —
 * none of which is an error worth showing. Browsers report all of these as
 * NotAllowedError or AbortError, and the library passes the name through.
 */
export function wasCancelled(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  const cause = (error as { cause?: { name?: string } } | null)?.cause?.name;
  return [name, cause].some((n) => n === "NotAllowedError" || n === "AbortError");
}

/** The device already holds a passkey for this account. */
export function alreadyRegistered(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED";
}

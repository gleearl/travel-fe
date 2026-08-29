import { clearToken, request, setToken, unwrap } from "./http";
import type { User } from "./types";

interface AuthPayload {
  token: string;
  user: User;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): Promise<User> {
  const payload = await request<AuthPayload>("/api/register", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
    // A taken email is an answer to show, not a session that expired.
    allowUnauthorized: true,
  });

  setToken(payload.token);
  return payload.user;
}

export async function login(email: string, password: string): Promise<User> {
  const payload = await request<AuthPayload>("/api/login", {
    method: "POST",
    body: { email, password },
    allowUnauthorized: true,
  });

  setToken(payload.token);
  return payload.user;
}

/** Resolves to null when nobody is signed in, rather than throwing. */
export async function me(): Promise<User | null> {
  try {
    return unwrap(await request<{ data: User }>("/api/me", { allowUnauthorized: true }));
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/api/logout", { method: "POST" });
  } finally {
    /* Whatever the server said, this device is signed out. A network error on
       the way out must not leave someone looking at a session they asked to
       end. */
    clearToken();
  }
}

export async function forgotPassword(email: string): Promise<string> {
  const payload = await request<{ message: string }>("/api/forgot-password", {
    method: "POST",
    body: { email },
    allowUnauthorized: true,
  });

  return payload.message;
}

export async function resetPassword(input: {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): Promise<void> {
  await request<{ message: string }>("/api/reset-password", {
    method: "POST",
    body: {
      token: input.token,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
    allowUnauthorized: true,
  });
}

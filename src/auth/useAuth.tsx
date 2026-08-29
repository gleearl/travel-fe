import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../lib/api/auth";
import { getToken, SESSION_ENDED } from "../lib/api/http";
import type { User } from "../lib/api/types";

interface AuthValue {
  user: User | null;
  /** "checking" until the stored token has been tried once. */
  status: "checking" | "ready";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthValue["status"]>("checking");

  /* One question on startup: is the token in storage still good? Asking it
     here rather than in each screen is what lets a reload land back where you
     were instead of at the sign-in page. */
  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setStatus("ready");
      return;
    }

    api.me().then((found) => {
      if (cancelled) return;
      setUser(found);
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* A token can stop working while the app is open — revoked from another
     device, or reset with the password. The http layer says so once; this is
     what turns that into being signed out rather than a screen of errors. */
  useEffect(() => {
    const onEnded = () => setUser(null);
    window.addEventListener(SESSION_ENDED, onEnded);
    return () => window.removeEventListener(SESSION_ENDED, onEnded);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signUp = useCallback(async (input: Parameters<typeof api.register>[0]) => {
    setUser(await api.register(input));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth used outside AuthProvider");
  return value;
}
